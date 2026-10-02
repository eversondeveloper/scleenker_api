import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { prisma } from './lib/prisma'
import { authRoutes } from './routes/auth.routes'
import { productsRoutes } from './routes/products.routes'
import { cashSessionsRoutes } from './routes/cash-sessions.routes'

const app = fastify()

app.register(cors, {
  origin: true,
})

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'scleenker_default_secret',
})

// Rota de teste
app.get('/health', async () => {
  const tenantsCount = await prisma.tenants.count()
  return { status: 'ok', tenantsCount }
})

// Rotas da aplicação
app.register(authRoutes)
app.register(productsRoutes)
app.register(cashSessionsRoutes)

app.listen({ port: 3333, host: '0.0.0.0' }).then(() => {
  console.log('HTTP Server running on http://localhost:3333')
})