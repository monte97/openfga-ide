import { Router } from 'express'
import * as runService from '../services/run-service.js'

const router = Router()

router.post('/api/suites/:suiteId/run', async (req, res, next) => {
  try {
    const testCaseId = typeof req.body?.testCaseId === 'string' ? req.body.testCaseId : undefined
    const { runId } = await runService.triggerRun(req.params.suiteId, testCaseId)
    res.status(202).json({ runId })
  } catch (err) {
    next(err)
  }
})

router.get('/api/runs/:runId', async (req, res, next) => {
  try {
    const run = await runService.getRun(req.params.runId)
    res.json(run)
  } catch (err) {
    next(err)
  }
})

export default router
