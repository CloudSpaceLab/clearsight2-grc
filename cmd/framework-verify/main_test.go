package main

import (
	"bytes"
	"encoding/json"
	"path/filepath"
	"testing"
)

func fixture(name string) string {
	return filepath.Join("..", "..", "internal", "frameworkcatalog", "testdata", name)
}

func TestValidSyntheticSourceProducesUnapprovedReceipt(t *testing.T) {
	var output bytes.Buffer
	if err := run([]string{"-manifest", fixture("synthetic_manifest.json"), "-source", fixture("synthetic_source.txt")}, &output); err != nil {
		t.Fatal(err)
	}
	var receipt struct {
		Status        string `json:"status"`
		ReleaseSHA256 string `json:"release_sha256"`
		SourceBytes   int64  `json:"source_bytes"`
	}
	if err := json.Unmarshal(output.Bytes(), &receipt); err != nil {
		t.Fatal(err)
	}
	if receipt.Status != "checksum_validated_not_approved" || receipt.SourceBytes != 159 || len(receipt.ReleaseSHA256) != 64 {
		t.Fatalf("unexpected receipt: %+v", receipt)
	}
}

func TestFailClosedOnWrongInput(t *testing.T) {
	for _, args := range [][]string{
		nil,
		{"-manifest", fixture("synthetic_manifest.json")},
		{"-source", fixture("synthetic_source.txt")},
		{"-manifest", fixture("synthetic_manifest.json"), "-source", fixture("synthetic_manifest.json")},
		{"-manifest", fixture("synthetic_manifest.json"), "-source", fixture("synthetic_source.txt"), "extra"},
		{"-manifest", fixture("synthetic_source.txt"), "-source", fixture("synthetic_manifest.json")},
	} {
		var output bytes.Buffer
		if err := run(args, &output); err == nil {
			t.Fatalf("accepted invalid arguments: %v", args)
		}
		if output.Len() > 0 {
			t.Fatalf("wrote success output on failure: %s", output.String())
		}
	}
}
