package services

import (
	"chat-server/internal/config"
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"go.uber.org/zap"
)

type CloudinaryService struct {
	cld    *cloudinary.Cloudinary
	logger *zap.SugaredLogger
}

func NewCloudinaryService(cfg *config.Config, logger *zap.SugaredLogger) (*CloudinaryService, error) {
	cld, err := cloudinary.NewFromURL(cfg.CloudinaryURL)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Cloudinary: %w", err)
	}

	logger.Info("✅ Cloudinary service initialized successfully")

	return &CloudinaryService{
		cld:    cld,
		logger: logger.Named("[cloudinary]"),
	}, nil
}

type UploadResult struct {
	URL       string `json:"url"`
	PublicID  string `json:"public_id"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
	Format    string `json:"format"`
	SecureURL string `json:"secure_url"`
}

func (s *CloudinaryService) UploadAvatar(ctx context.Context, file multipart.File, filename string) (*UploadResult, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}

	if !allowedExts[ext] {
		return nil, fmt.Errorf("invalid file type: %s. Allowed types: jpg, jpeg, png, gif, webp", ext)
	}

	uniqueFilename := true
	overwrite := false

	uploadParams := uploader.UploadParams{
		Folder:         "avatars",
		UniqueFilename: &uniqueFilename,
		Overwrite:      &overwrite,
		ResourceType:   "image",
		Transformation: "w_400,h_400,c_fill,g_face",
		AllowedFormats: []string{"jpg", "png", "gif", "webp"},
		Format:         "webp",
	}

	s.logger.Infow("Uploading avatar to Cloudinary",
		"filename", filename,
		"folder", uploadParams.Folder,
	)

	result, err := s.cld.Upload.Upload(ctx, file, uploadParams)
	if err != nil {
		s.logger.Errorw("Failed to upload to Cloudinary",
			"filename", filename,
			"error", err,
		)
		return nil, fmt.Errorf("failed to upload image: %w", err)
	}

	s.logger.Infow("Avatar uploaded successfully",
		"filename", filename,
		"public_id", result.PublicID,
		"url", result.SecureURL,
	)

	return &UploadResult{
		URL:       result.URL,
		PublicID:  result.PublicID,
		Width:     result.Width,
		Height:    result.Height,
		Format:    result.Format,
		SecureURL: result.SecureURL,
	}, nil
}

func (s *CloudinaryService) DeleteAvatar(ctx context.Context, publicID string) error {
	if publicID == "" {
		return nil
	}

	s.logger.Infow("Deleting avatar from Cloudinary",
		"public_id", publicID,
	)

	_, err := s.cld.Upload.Destroy(ctx, uploader.DestroyParams{
		PublicID:     publicID,
		ResourceType: "image",
	})

	if err != nil {
		s.logger.Errorw("Failed to delete from Cloudinary",
			"public_id", publicID,
			"error", err,
		)
		return fmt.Errorf("failed to delete image: %w", err)
	}

	s.logger.Infow("Avatar deleted successfully",
		"public_id", publicID,
	)

	return nil
}
