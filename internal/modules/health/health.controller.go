package health

import (
	"chat-server/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Controller struct {
	service *Service
}

func NewController(service *Service) *Controller {
	return &Controller{service: service}
}

// HealthCheck godoc
// @Summary      Health check
// @Description  Check the health status of the API and database
// @Tags         health
// @Produce      json
// @Success      200  {object}  HealthSuccessResponse
// @Failure      503  {object}  utils.APIError
// @Router       /health [get]
func (ctrl *Controller) HealthCheck(c *gin.Context) (interface{}, error) {
	health := ctrl.service.CheckHealth()

	if health.Status != "healthy" {
		return nil, utils.NewHTTPError(http.StatusServiceUnavailable, "System is unhealthy")
	}

	return health, nil
}
