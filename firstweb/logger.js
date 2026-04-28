const { createLogger, format, transports } = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaKeys = Object.keys(meta)
      const metaStr = meta && metaKeys.length ? JSON.stringify(meta) : ''
      return `${timestamp} [${level}] ${message} ${metaStr}`
    })
  ),
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: 'app-%DATE%.log',
      dirname: 'logs',
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '3d',
      zippedArchive: false
    })
  ],
  exceptionHandlers: [
    new transports.Console(),
    new DailyRotateFile({ filename: 'exceptions-%DATE%.log', dirname: 'logs', datePattern: 'YYYY-MM-DD', maxSize: '10m', maxFiles: '3d' })
  ]
})

logger.stream = {
  write: (message) => {
    logger.info(message.trim())
  }
}

module.exports = logger
