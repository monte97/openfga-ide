import { Router, type Request } from 'express'
import { validate } from '../../middleware/validate.js'
import { createSuiteSchema, updateSuiteSchema } from '../schemas/suite.js'
import * as suiteService from '../services/suite-service.js'

const router = Router()

router.get('/api/suites', async (_req, res, next) => {
  try {
    const suites = await suiteService.listSuites()
    res.json({ suites })
  } catch (err) {
    next(err)
  }
})

router.post('/api/suites', validate(createSuiteSchema), async (req, res, next) => {
  try {
    const suite = await suiteService.createSuite(req.body)
    res.status(201).json(suite)
  } catch (err) {
    next(err)
  }
})

router.get('/api/suites/:suiteId', async (req: Request<{ suiteId: string }>, res, next) => {
  try {
    const suite = await suiteService.getSuite(req.params.suiteId)
    res.json(suite)
  } catch (err) {
    next(err)
  }
})

router.get('/api/suites/:suiteId/export', async (req: Request<{ suiteId: string }>, res, next) => {
  try {
    const suite = await suiteService.getSuite(req.params.suiteId)
    res.json({
      name: suite.name,
      description: suite.description,
      tags: suite.tags,
      definition: suite.definition,
    })
  } catch (err) {
    next(err)
  }
})

router.put('/api/suites/:suiteId', validate(updateSuiteSchema), async (req: Request<{ suiteId: string }>, res, next) => {
  try {
    const suite = await suiteService.updateSuite(req.params.suiteId, req.body)
    res.json(suite)
  } catch (err) {
    next(err)
  }
})

router.delete('/api/suites/:suiteId', async (req: Request<{ suiteId: string }>, res, next) => {
  try {
    await suiteService.deleteSuite(req.params.suiteId)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
