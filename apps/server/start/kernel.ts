import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

server.use([
  () => import('@adonisjs/static/static_middleware'),
  () => import('../app/middleware/spa_fallback_middleware.js'),
])

router.use([
  () => import('@adonisjs/cors/cors_middleware'),
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('../app/middleware/session_generation_middleware.js'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
])
