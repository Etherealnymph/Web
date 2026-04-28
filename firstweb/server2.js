// 访问文件列表
// 注册页面
const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const morgan = require('morgan')
const logger = require('./logger')
const { body, query, validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')

const usersFile = path.join(__dirname, 'users.json')

function loadUsers(cb) {
    fs.readFile(usersFile, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') return cb(null, [])
            return cb(err)
        }
        try {
            const arr = JSON.parse(data || '[]')
            return cb(null, arr)
        } catch (e) {
            return cb(e)
        }
    })
}

function saveUsers(users, cb) {
    fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8', cb)
}

// 启动服务（端口12399）
app.listen(12399, () => {
    logger.info('服务已启动: http://localhost:12399')
})

// 静态资源：图片、HTML、CSS 都能访问
// HTTP request logging (to console and rotating files)
app.use(morgan('combined', { stream: logger.stream }))

// 记录静态媒体访问：当请求指向 public 下的文件（尤其是 /media/ 或常见音视频/图片扩展名）时，写一条 info 日志
app.use((req, res, next) => {
    const reqPath = req.path || req.url
    const cleanPath = decodeURIComponent((reqPath || '').split('?')[0])
    const mediaExtensions = ['.mp3', '.mp4', '.wav', '.ogg', '.m4a', '.webm', '.mpg', '.mpeg', '.jpg', '.jpeg', '.png', '.gif', '.svg']
    const isMedia = cleanPath.startsWith('/media/') || mediaExtensions.some(ext => cleanPath.toLowerCase().endsWith(ext))
    if (!isMedia) return next()

    const filePath = path.join(__dirname, 'public', cleanPath)
    fs.stat(filePath, (err, stats) => {
        if (err) {
            // 仅在不是文件不存在的情况下记录错误，避免噪声
            if (err.code && err.code !== 'ENOENT') {
                logger.error(`stat 文件失败: ${filePath}`, { err })
            }
            return next()
        }

        if (stats.isFile()) {
            const forwarded = req.headers['x-forwarded-for']
            const clientIp = forwarded ? forwarded.split(',')[0].trim() : (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown')
            logger.info(`静态文件访问: ${req.method} ${cleanPath} 来自 ${clientIp}`)
        }
        next()
    })
})

app.use(express.static('public'))

// 解析 POST 表单数据（必须加）
app.use(express.urlencoded({ extended: true }))

// 模板视图目录与引擎（设置在路由之前）
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// 返回 media 目录下的文件列表（用于前端动态搜索匹配）
app.get('/media/list', [
    query('filter').optional().trim().isLength({ max: 50 }).escape()
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        logger.warn('media/list query 校验失败', { errors: errors.array() })
        return res.status(400).json({ files: [], errors: errors.array() })
    }

    const mediaDir = path.join(__dirname, 'public', 'media')
    const filter = req.query.filter
    fs.readdir(mediaDir, (err, files) => {
        if (err) {
            logger.error('读取 media 目录失败', { err })
            return res.status(500).json({ files: [], error: '无法读取媒体目录' })
        }
        let filesList = files || []
        if (filter) {
            filesList = filesList.filter(f => f.startsWith(filter))
        }
        res.json({ files: filesList })
    })
})

// 模板引擎已在上方配置

// ------------------------------
// 1. 显示表单页面（静态页面）
// ------------------------------
app.get('/', (req, res) => {
    logger.info('========= 用户已登录 =========')
    // 直接跳转到登录页面（静态页面）
    res.redirect('/html/register.html')
})

// ------------------------------
// 2. 接收表单 POST 数据并显示
// ------------------------------
app.post('/', [
    body('nickname').trim().isLength({ min: 1 }).withMessage('昵称不能为空').escape(),
    body('studentId').trim().isNumeric().withMessage('学号应为数字').isLength({ min: 6, max: 20 }).withMessage('学号长度不正确').escape(),
    body('secret').trim().isLength({ min: 4 }).withMessage('密码长度至少4')
], (req, res) => {
    logger.info('========= 接收表单数据 =========')
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        logger.warn('表单校验失败', { errors: errors.array() })
        return res.status(400).redirect('/html/fail.html')
    }

    logger.info(`昵称： ${req.body.nickname}`)
    logger.info(`学号： ${req.body.studentId}`)
    // 不记录明文密码到文件，仅记录为掩码
    logger.info(`密码： ${req.body.secret ? '***' : ''}`)

    if (req.body.studentId === "2025120901016" && req.body.secret === "123456") {
        logger.info('登录成功！')
        logger.info('========= 进入/views/success.ejs =========')
        // 渲染 views/success.ejs，并把用户名传给模板
        res.render('success', { nickname: req.body.nickname })
    } else {
        logger.warn('登录失败！')
        logger.info('========= 进入/html/fail.html =========')
        // 登录失败重定向到静态失败页面
        res.redirect('/html/fail.html')
    }
})

// ------------------------------
// 注册路由
// ------------------------------
app.post('/register', [
    body('nickname').trim().isLength({ min: 1 }).withMessage('昵称不能为空').escape(),
    body('studentId').trim().isNumeric().withMessage('学号应为数字').isLength({ min: 6, max: 20 }).withMessage('学号长度不正确').escape(),
    body('secret').trim().isLength({ min: 6 }).withMessage('密码长度至少6')
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        logger.warn('注册校验失败', { errors: errors.array() })
        return res.status(400).json({ errors: errors.array() })
    }

    const { nickname, studentId, secret } = req.body

    loadUsers((err, users) => {
        if (err) {
            logger.error('加载用户列表失败', { err })
            return res.status(500).json({ error: '内部错误' })
        }

        if (users.find(u => u.studentId === studentId)) {
            logger.warn('尝试注册已存在学号', { studentId })
            return res.status(409).json({ error: '学号已被注册' })
        }

        bcrypt.hash(secret, 10, (err, passwordHash) => {
            if (err) {
                logger.error('密码哈希失败', { err })
                return res.status(500).json({ error: '内部错误' })
            }
            const newUser = { nickname, studentId, passwordHash, createdAt: new Date().toISOString() }
            users.push(newUser)

            saveUsers(users, (err) => {
                if (err) {
                    logger.error('保存新用户失败', { err })
                    return res.status(500).json({ error: '无法保存用户' })
                }
                logger.info('用户注册成功', { studentId })
                return res.status(201).json({ message: '注册成功' })
            })
        })
    })
})