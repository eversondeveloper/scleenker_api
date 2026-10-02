import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

export async function authRoutes(app: FastifyInstance) {
  app.post('/sessions', async (request, reply) => {
    const authenticateBodySchema = z.object({
      email: z.string().email(),
      password: z.string(),
    })

    const { email, password } = authenticateBodySchema.parse(request.body)

    const user = await prisma.users.findUnique({
      where: { email },
    })

    if (!user || !user.is_active) {
      return reply.status(400).send({ message: 'Credenciais inválidas.' })
    }

    const doesPasswordMatch = await bcrypt.compare(password, user.password_hash)

    if (!doesPasswordMatch) {
      return reply.status(400).send({ message: 'Credenciais inválidas.' })
    }

    const token = await reply.jwtSign(
      {
        role: user.role,
        tenant_id: user.tenant_id,
      },
      {
        sign: {
          sub: user.id,
          expiresIn: '7d',
        },
      }
    )

    return reply.status(200).send({ token })
  })
}