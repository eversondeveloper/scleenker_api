import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { verifyJwt } from '../middlewares/verify-jwt'

export async function productsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', verifyJwt)

  // Listar produtos da empresa autenticada
  app.get('/products', async (request) => {
    const products = await prisma.products.findMany({
      where: {
        tenant_id: request.user.tenant_id,
        is_active: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { products }
  })

  // Criar produto vinculado à empresa autenticada
  app.post('/products', async (request, reply) => {
    const createProductBodySchema = z.object({
      name: z.string().min(1),
      barcode: z.string().optional(),
      sku: z.string().optional(),
      description: z.string().optional(),
      cost_price: z.number().nonnegative().default(0),
      sale_price: z.number().positive(),
      unit_type: z.string().default('UN'),
      manage_stock: z.boolean().default(true),
      current_stock: z.number().default(0),
      min_stock: z.number().default(0),
    })

    const data = createProductBodySchema.parse(request.body)

    const product = await prisma.products.create({
      data: {
        ...data,
        tenant_id: request.user.tenant_id,
      },
    })

    return reply.status(201).send({ product })
  })
}