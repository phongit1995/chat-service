package relationships

import (
	"chat-server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(relationship *models.Relationship) error {
	return r.db.Create(relationship).Error
}

func (r *Repository) FindByID(id uuid.UUID) (*models.Relationship, error) {
	var relationship models.Relationship
	err := r.db.Preload("Requester").Preload("Addressee").First(&relationship, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &relationship, nil
}

func (r *Repository) FindByUsers(userID1, userID2 uuid.UUID) (*models.Relationship, error) {
	var relationship models.Relationship
	err := r.db.Where(
		"(requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
		userID1, userID2, userID2, userID1,
	).Preload("Requester").Preload("Addressee").First(&relationship).Error

	if err != nil {
		return nil, err
	}
	return &relationship, nil
}

func (r *Repository) Update(relationship *models.Relationship) error {
	return r.db.Save(relationship).Error
}

func (r *Repository) Delete(relationship *models.Relationship) error {
	return r.db.Delete(relationship).Error
}

func (r *Repository) GetPendingRequests(userID uuid.UUID) ([]models.Relationship, error) {
	var relationships []models.Relationship
	err := r.db.Where("addressee_id = ? AND status = ?", userID, models.RelationshipStatusPending).
		Preload("Requester").
		Order("created_at DESC").
		Find(&relationships).Error

	return relationships, err
}

func (r *Repository) GetSentRequests(userID uuid.UUID) ([]models.Relationship, error) {
	var relationships []models.Relationship
	err := r.db.Where("requester_id = ? AND status = ?", userID, models.RelationshipStatusPending).
		Preload("Addressee").
		Order("created_at DESC").
		Find(&relationships).Error

	return relationships, err
}

func (r *Repository) GetFriends(userID uuid.UUID) ([]models.Relationship, error) {
	var relationships []models.Relationship
	err := r.db.Where(
		"(requester_id = ? OR addressee_id = ?) AND status = ?",
		userID, userID, models.RelationshipStatusAccepted,
	).Preload("Requester").Preload("Addressee").
		Order("actioned_at DESC").
		Find(&relationships).Error

	return relationships, err
}

func (r *Repository) GetBlockedUsers(userID uuid.UUID) ([]models.Relationship, error) {
	var relationships []models.Relationship
	err := r.db.Where("requester_id = ? AND status = ?", userID, models.RelationshipStatusBlocked).
		Preload("Addressee").
		Order("actioned_at DESC").
		Find(&relationships).Error

	return relationships, err
}

func (r *Repository) CheckRelationshipExists(userID1, userID2 uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Relationship{}).Where(
		"(requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
		userID1, userID2, userID2, userID1,
	).Count(&count).Error

	return count > 0, err
}

func (r *Repository) IsBlocked(blockerID, blockedID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.Relationship{}).Where(
		"requester_id = ? AND addressee_id = ? AND status = ?",
		blockerID, blockedID, models.RelationshipStatusBlocked,
	).Count(&count).Error

	return count > 0, err
}
