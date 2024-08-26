import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

/**
 * 
 * Sobre Testes Automatizados
 * ----
 * Testes Unitários: unidade da sua aplicação
 * Testes de Integração: testa a integração entre diferentes partes do sistema (comunicação entre duas ou mais unidades)
 * Testes de E2E - ponta a ponta: testa a aplicação como um todo, de ponto a ponto (simula um 
 * usuário operando na nossa aplicação).
 * ---
 * front-end: abre a página de login, digite o texto diego@rocketseat.com.br no campo com ID email, clique no botão
 * back-end: chamadas HTTP, WebSockets
 * ---
 * Pirâmide de testes: E2E (não dependem de nenhuma tecnologia, não dependem de arquitetura)
 * A base é os Testes Unitários (porque precisam ser feitos muitos por serem extremamente rápidos) 
 * depois são os Testes de Integração (porque ficam no meio da pirâmide) e por fim os Testes de E2E (porque são 
 * o topo da pirâmide de testes e são gastos mais tempo)
 */


export async function transactionsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    console.log(`[${request.method}] ${request.url}`)
  })

  app.get(
    '/', 
    {
      preHandler: [checkSessionIdExists]
    }, 
  async (request, reply) => {
    const { sessionId } = request.cookies

    const transactions = await knex('transactions')
    .where('session_id', sessionId)
    .select()

    return { transactions }
  })

  app.get(
    '/:id',
    {
      preHandler: [checkSessionIdExists]
    }, 
    async (request) => {
    const getTransactionParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getTransactionParamsSchema.parse(request.params)

    const { sessionId } = request.cookies

    const transaction = await knex('transactions')
    .where({
      session_id: sessionId,
      id,
    })
    .first()

    return { transaction }
  })

  app.get(
    '/summary',
    {
      preHandler: [checkSessionIdExists]
    },
    async (request) => {
      const { sessionId } = request.cookies

      const summary = await knex('transactions')
      .where('session_id', sessionId)
      .sum('amount', { as: 'amount' })
      .first()

      return { summary }
  })

  app.post(
    '/',
    {
      preHandler: [checkSessionIdExists]
    }, 
    async (request, reply) => {
    // { title, amount, type: credit ou debit }
    
    const createTransactionBodySchema =  z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    const {title, amount, type} = createTransactionBodySchema.parse(request.body,)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID() 
        reply.cookie('sessionId', sessionId, {
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
    })

    return reply.status(201).send()
  })
}
