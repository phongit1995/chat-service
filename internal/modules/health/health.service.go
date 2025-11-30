package health

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{
		db: db,
	}
}

func (s *Service) CheckHealth() *HealthResponse {
	services := make(map[string]string)

	dbStatus := s.checkDatabase()
	services["database"] = dbStatus

	overallStatus := "healthy"
	if dbStatus != "healthy" {
		overallStatus = "unhealthy"
	}

	return &HealthResponse{
		Status:   overallStatus,
		Services: services,
		Version:  "1.0.0",
	}
}

func (s *Service) checkDatabase() string {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	sqlDB, err := s.db.DB()
	if err != nil {
		return "unhealthy"
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		return "unhealthy"
	}

	return "healthy"
}

