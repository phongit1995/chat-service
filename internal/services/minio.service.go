package services

import (
	"chat-server/internal/config"
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

type UploadResult struct {
	URL       string `json:"url"`
	PublicID  string `json:"public_id"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
	Format    string `json:"format"`
	SecureURL string `json:"secure_url"`
}

type MinIOService struct {
	client    *minio.Client
	bucket    string
	publicURL string
	logger    *zap.SugaredLogger
}

func NewMinIOService(cfg *config.Config, logger *zap.SugaredLogger) (*MinIOService, error) {
	client, err := minio.New(cfg.MinIOEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinIOAccessKey, cfg.MinIOSecretKey, ""),
		Secure: cfg.MinIOUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MinIO client: %w", err)
	}

	ctx := context.Background()
	exists, err := client.BucketExists(ctx, cfg.MinIOBucket)
	if err != nil {
		return nil, fmt.Errorf("failed to check MinIO bucket: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, cfg.MinIOBucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("failed to create MinIO bucket: %w", err)
		}

		policy := fmt.Sprintf(`{
			"Version":"2012-10-17",
			"Statement":[{
				"Effect":"Allow",
				"Principal":{"AWS":["*"]},
				"Action":["s3:GetObject"],
				"Resource":["arn:aws:s3:::%s/*"]
			}]
		}`, cfg.MinIOBucket)
		if err := client.SetBucketPolicy(ctx, cfg.MinIOBucket, policy); err != nil {
			logger.Warnw("Failed to set bucket public policy", "error", err)
		}
	}

	publicURL := cfg.MinIOPublicURL
	if publicURL == "" {
		scheme := "http"
		if cfg.MinIOUseSSL {
			scheme = "https"
		}
		publicURL = fmt.Sprintf("%s://%s", scheme, cfg.MinIOEndpoint)
	}

	logger.Info("MinIO service initialized successfully")

	return &MinIOService{
		client:    client,
		bucket:    cfg.MinIOBucket,
		publicURL: publicURL,
		logger:    logger.Named("[minio]"),
	}, nil
}

var allowedExts = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".gif":  "image/gif",
	".webp": "image/webp",
}

func (s *MinIOService) UploadFile(ctx context.Context, file multipart.File, filename string, folder string) (*UploadResult, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	contentType, ok := allowedExts[ext]
	if !ok {
		return nil, fmt.Errorf("invalid file type: %s. Allowed: jpg, jpeg, png, gif, webp", ext)
	}

	objectName := fmt.Sprintf("%s/%s%s", folder, uuid.New().String(), ext)

	fileSize, err := getFileSize(file)
	if err != nil {
		return nil, fmt.Errorf("failed to determine file size: %w", err)
	}

	s.logger.Infow("Uploading file to MinIO",
		"object", objectName,
		"size", fileSize,
		"content_type", contentType,
	)

	_, err = s.client.PutObject(ctx, s.bucket, objectName, file, fileSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		s.logger.Errorw("Failed to upload to MinIO", "object", objectName, "error", err)
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}

	url := fmt.Sprintf("%s/%s/%s", s.publicURL, s.bucket, objectName)

	s.logger.Infow("File uploaded successfully", "object", objectName, "url", url)

	return &UploadResult{
		URL:       url,
		SecureURL: url,
		PublicID:  objectName,
		Format:    strings.TrimPrefix(ext, "."),
	}, nil
}

func (s *MinIOService) DeleteFile(ctx context.Context, objectName string) error {
	if objectName == "" {
		return nil
	}

	s.logger.Infow("Deleting file from MinIO", "object", objectName)

	err := s.client.RemoveObject(ctx, s.bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		s.logger.Errorw("Failed to delete from MinIO", "object", objectName, "error", err)
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

func (s *MinIOService) GetPresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	url, err := s.client.PresignedGetObject(ctx, s.bucket, objectName, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}
	return url.String(), nil
}

func getFileSize(file multipart.File) (int64, error) {
	type sizer interface {
		Seek(offset int64, whence int) (int64, error)
	}
	if s, ok := file.(sizer); ok {
		size, err := s.Seek(0, 2)
		if err != nil {
			return -1, err
		}
		_, err = s.Seek(0, 0)
		if err != nil {
			return -1, err
		}
		return size, nil
	}
	return -1, nil
}
