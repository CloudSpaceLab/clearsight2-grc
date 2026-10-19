package programread

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

const defaultPageSize = 25
const maximumPageSize = 50

type ListQuery struct {
	Limit int
	Cursor string
}

type ListPage struct {
	Items []Record `json:"items"`
	NextCursor string `json:"next_cursor,omitempty"`
}

type ListRepository interface {
	ListVisible(context.Context, identity.Actor, ListQuery) (ListPage,error)
}

// A cursor is an untrusted position, never a tenant/permission claim.
type listCursor struct {
	UpdatedAt time.Time `json:"updated_at"`
	ID string `json:"id"`
}

func decodeListCursor(raw string) (listCursor,error) {
	if raw=="" {return listCursor{},nil}
	if len(raw)>256 {return listCursor{},errors.New("cursor too long")}
	data,err:=base64.RawURLEncoding.DecodeString(raw)
	if err!=nil {return listCursor{},errors.New("invalid cursor")}
	decoder:=json.NewDecoder(strings.NewReader(string(data)))
	decoder.DisallowUnknownFields()
	var cursor listCursor
	if err:=decoder.Decode(&cursor);err!=nil {return listCursor{},errors.New("invalid cursor")}
	var trailing any
	if err:=decoder.Decode(&trailing);!errors.Is(err,io.EOF) {return listCursor{},errors.New("invalid cursor")}
	if cursor.UpdatedAt.IsZero() || !isUUID(cursor.ID) {
		return listCursor{},errors.New("invalid cursor")
	}
	return cursor,nil
}
func encodeListCursor(updatedAt time.Time, id string) string {
	data,_:=json.Marshal(listCursor{UpdatedAt:updatedAt.UTC(),ID:id})
	return base64.RawURLEncoding.EncodeToString(data)
}

func isUUID(value string) bool {
	if len(value)!=36 {return false}
	for i,r:=range value {
		switch i {case 8,13,18,23:if r!='-' {return false};continue}
		if !((r>='0'&&r<='9')||(r>='a'&&r<='f')||(r>='A'&&r<='F')) {return false}
	}
	return true
}
func listQuery(r *http.Request) (ListQuery,error) {
	query:=r.URL.Query()
	for key,values:=range query {
		if (key!="limit"&&key!="cursor") || len(values)!=1 {return ListQuery{},errors.New("invalid list parameters")}
	}
	result:=ListQuery{Limit:defaultPageSize, Cursor:query.Get("cursor")}
	if raw:=query.Get("limit");raw!="" {
		n,err:=strconv.Atoi(raw)
		if err!=nil||n<1||n>maximumPageSize {return ListQuery{},errors.New("invalid page size")}
		result.Limit=n
	}
	if _,err:=decodeListCursor(result.Cursor);err!=nil{return ListQuery{},err}
	return result,nil
}

// ServeListHTTP is a metadata-only endpoint. No unscoped database query,
// compliance projections or arbitrary user-supplied tenant filters are allowed.
func (h Handler) ServeListHTTP(w http.ResponseWriter,r *http.Request) {
	w.Header().Set("Cache-Control","no-store")
	w.Header().Set("X-Content-Type-Options","nosniff")
	if r.Method!=http.MethodGet {
		w.Header().Set("Allow","GET")
		http.Error(w,"method not allowed",http.StatusMethodNotAllowed)
		return
	}
	actor,ok:=h.authorizedActor(w,r)
	if !ok{return}
	query,err:=listQuery(r)
	if err!=nil {http.Error(w,"invalid pagination",http.StatusBadRequest);return}
	repo,ok:=h.Repository.(ListRepository)
	if !ok || repo==nil {
		http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
		return
	}
	page,err:=repo.ListVisible(r.Context(),actor,query)
	if err!=nil {
		http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
		return
	}
	if len(page.Items)>query.Limit || len(page.Items)>maximumPageSize {
		http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
		return
	}
	for _,record:=range page.Items {
		if !visibleToActor(actor,record.ID,record) || !isUUID(record.ID) {
			http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
			return
		}
	}
	if page.Items==nil {page.Items=[]Record{}}
	w.Header().Set("Content-Type","application/json; charset=utf-8")
	if err:=json.NewEncoder(w).Encode(page);err!=nil {_=fmt.Errorf("encode page: %w",err)}
}
