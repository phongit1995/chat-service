package call

import (
	"chat-server/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(call *models.Call) error {
	return r.db.Create(call).Error
}

func (r *Repository) FindByID(id uuid.UUID) (*models.Call, error) {
	var call models.Call
	if err := r.db.First(&call, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &call, nil
}

func (r *Repository) FindByRoomName(roomName string) (*models.Call, error) {
	var call models.Call
	if err := r.db.First(&call, "room_name = ?", roomName).Error; err != nil {
		return nil, err
	}
	return &call, nil
}

func (r *Repository) UpdateStatus(id uuid.UUID, status models.CallStatus) error {
	return r.db.Model(&models.Call{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     status,
			"updated_at": time.Now(),
		}).Error
}

func (r *Repository) MarkAnswered(id uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&models.Call{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":      models.CallStatusActive,
			"answered_at": &now,
			"updated_at":  now,
		}).Error
}

func (r *Repository) MarkEnded(id uuid.UUID, finalStatus models.CallStatus) (*models.Call, error) {
	call, err := r.FindByID(id)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	call.Status = finalStatus
	call.EndedAt = &now
	call.UpdatedAt = now

	if call.AnsweredAt != nil {
		dur := int(now.Sub(*call.AnsweredAt).Seconds())
		call.DurationSeconds = &dur
	} else {
		zero := 0
		call.DurationSeconds = &zero
	}

	if err := r.db.Save(call).Error; err != nil {
		return nil, err
	}
	return call, nil
}

func (r *Repository) ListByConversation(conversationID uuid.UUID, limit int) ([]models.Call, error) {
	var calls []models.Call
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	err := r.db.Where("conversation_id = ?", conversationID).
		Order("started_at DESC").
		Limit(limit).
		Find(&calls).Error
	return calls, err
}
