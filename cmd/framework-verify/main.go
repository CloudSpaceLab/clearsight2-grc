// Command framework-verify checks an operator-supplied edition manifest and source file.
//
// It never publishes an edition, authenticates an issuer, or approves licensing.
package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/frameworkcatalog"
)

type receipt struct {
	PublisherCode string `json:"publisher_code"`
	FrameworkCode string `json:"framework_code"`
	EditionCode   string `json:"edition_code"`
	SourceSHA256  string `json:"source_sha256"`
	ReleaseSHA256 string `json:"release_sha256"`
	SourceBytes   int64  `json:"source_bytes"`
	Status        string `json:"status"`
}

func verify(manifest, source io.Reader) (receipt, error) {
	publication, digest, size, err := frameworkcatalog.VerifyPublicationSource(manifest, source)
	if err != nil {
		return receipt{}, err
	}
	return receipt{
		PublisherCode: publication.PublisherCode,
		FrameworkCode: publication.FrameworkCode,
		EditionCode: publication.EditionCode,
		SourceSHA256: publication.SourceSHA256,
		ReleaseSHA256: digest,
		SourceBytes: size,
		Status: "checksum_validated_not_approved",
	}, nil
}

func run(args []string, stdout io.Writer) error {
	flags := flag.NewFlagSet("framework-verify", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	manifestPath := flags.String("manifest", "", "publication manifest JSON")
	sourcePath := flags.String("source", "", "original source artifact")
	if err := flags.Parse(args); err != nil {
		return fmt.Errorf("invalid arguments: %w", err)
	}
	if *manifestPath == "" || *sourcePath == "" || flags.NArg() != 0 {
		return errors.New("usage: framework-verify -manifest <manifest.json> -source <original-document>")
	}
	if *manifestPath == *sourcePath {
		return errors.New("source and manifest must be different files")
	}
	manifest, err := os.Open(*manifestPath)
	if err != nil {
		return fmt.Errorf("open manifest: %w", err)
	}
	defer manifest.Close()
	source, err := os.Open(*sourcePath)
	if err != nil {
		return fmt.Errorf("open source: %w", err)
	}
	defer source.Close()
	result, err := verify(manifest, source)
	if err != nil {
		return err
	}
	return json.NewEncoder(stdout).Encode(result)
}

func main() {
	if err := run(os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
