package logger

import (
	"chat-server/internal/config"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func CreateLogger(cfg *config.Config) (*zap.SugaredLogger, error) {
	var zapConfig zap.Config

	if cfg.Env == "production" {
		zapConfig = zap.NewProductionConfig()
		zapConfig.DisableCaller = true
		zapConfig.DisableStacktrace = true
		zapConfig.EncoderConfig.TimeKey = "time"
		zapConfig.EncoderConfig.LevelKey = "level"
		zapConfig.EncoderConfig.MessageKey = "msg"
	} else {
		zapConfig = zap.NewDevelopmentConfig()
		zapConfig.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		zapConfig.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		zapConfig.DisableCaller = true
		zapConfig.DisableStacktrace = true
		zapConfig.Development = false
	}

	zapConfig.OutputPaths = []string{"stdout"}
	zapConfig.ErrorOutputPaths = []string{"stderr"}

	logger, err := zapConfig.Build()
	if err != nil {
		return nil, err
	}
	return logger.Sugar(), nil
}
