import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { verifyJwt } from '../middlewares/verify-jwt'

export async function cashSessionsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  // Consultar sessão ativa no terminal
  app.get('/cash-sessions/current', async (request, reply) => {
    const session = await prisma.cash_sessions.findFirst({
      where: {
        tenant_id: request.user.tenant_id,
        status: 'OPEN',
      },
      include: {
        pos_terminals: true,
      },
    })

    if (!session) {
      return reply.status(404).send({ message: 'Nenhuma sessão de caixa aberta.' })
    }

    return { session }
  })

  // Abrir sessão de caixa
  app.post('/cash-sessions/open', async (request, reply) => {
    const openSessionBodySchema = z.object({
      terminal_id: z.string().uuid(),
      opening_balance: z.number().nonnegative().default(0),
      notes: z.string().optional(),
    })

    const { terminal_id, opening_balance, notes } = openSessionBodySchema.parse(request.body)

    const activeSession = await prisma.cash_sessions.findFirst({
      where: {
        tenant_id: request.user.tenant_id,
        terminal_id,
        status: 'OPEN',
      },
    })

    if (activeSession) {
      return reply.status(400).send({ message: 'Já existe uma sessão aberta neste terminal.' })
    }

    const session = await prisma.cash_sessions.create({
      data: {
        tenant_id: request.user.tenant_id,
        terminal_id,
        opened_by: request.user.sub,
        opening_balance,
        status: 'OPEN',
        notes,
      },
    })

    return reply.status(201).send({ session })
  })

  // Fechar sessão de caixa
  app.patch('/cash-sessions/:id/close', async (request, reply) => {
    const closeParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const closeBodySchema = z.object({
      closing_balance: z.number().nonnegative(),
      notes: z.string().optional(),
    })

    const { id } = closeParamsSchema.parse(request.params)
    const { closing_balance, notes } = closeBodySchema.parse(request.body)

    const session = await prisma.cash_sessions.findUnique({
      where: { id },
    })

    if (!session || session.tenant_id !== request.user.tenant_id) {
      return reply.status(404).send({ message: 'Sessão de caixa não encontrada.' })
    }

    if (session.status !== 'OPEN') {
      return reply.status(400).send({ message: 'Esta sessão de caixa já se encontra fechada.' })
    }

    const updatedSession = await prisma.cash_sessions.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closed_by: request.user.sub,
        closing_balance,
        closed_at: new Date(),
        notes: notes ? `${session.notes || ''} | ${notes}` : session.notes,
      },
    })

    return reply.status(200).send({ session: updatedSession })
  })
}