import { DummyRecord, DummyRequestMessage, DummyStateChangedEvent } from './dummy'

import { Agent, AriesFrameworkError, ConsoleLogger, LogLevel, WsOutboundTransport } from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import { filter, first, firstValueFrom, map, ReplaySubject, timeout } from 'rxjs'
import express from 'express'

import { DummyEventTypes, DummyModule, DummyState } from './dummy'

const run = async () => {
    // Create transports
    const port = process.env.RESPONDER_PORT ? Number(process.env.RESPONDER_PORT) : 3002
    const requesterPort = process.env.REQUESTER_PORT ? Number(process.env.REQUESTER_PORT) : 3003
    const wsOutboundTransport = new WsOutboundTransport()
    const app = express()

    // Setup the agent
    const agent = new Agent(
        {
            label: 'Dummy-powered agent - requester',
            walletConfig: {
                id: 'requester',
                key: 'requester',
            },
            logger: new ConsoleLogger(LogLevel.test),
            autoAcceptConnections: true,
        },
        agentDependencies
    )

    app.get("/message", async (req, res) => {
        try {
            const message = req.query.message as string
            // Send a dummy request and wait for response
            const msg = new DummyRequestMessage({})
            msg.message = message
            const record = await dummyModule.request(msg, connectionRecord.id)
            agent.config.logger.info(`Request received for Dummy Record: ${record.id}`)

            const dummyRecord = await firstValueFrom(subject)
            agent.config.logger.info(`Response received for Dummy Record: ${dummyRecord.id}`)

            res.send(JSON.stringify({ dummyRecord, record }, null, 4))
        } catch (e) {
            console.log(e);
            res.send(e.toString())
        }
    })
    app.listen(requesterPort, "0.0.0.0", () => {
        console.log(`Requester listening on port ${requesterPort}`)
    })
    // Register transports
    agent.registerOutboundTransport(wsOutboundTransport)

    // Inject DummyModule
    const dummyModule = agent.injectionContainer.resolve(DummyModule)

    // Now agent will handle messages and events from Dummy protocol

    //Initialize the agent
    await agent.initialize()

    // Connect to responder using its invitation endpoint
    const invitationUrl = await (await agentDependencies.fetch(`http://localhost:${port}/invitation`)).text()
    const { connectionRecord } = await agent.oob.receiveInvitationFromUrl(invitationUrl)
    if (!connectionRecord) {
        throw new AriesFrameworkError('Connection record for out-of-band invitation was not created.')
    }
    await agent.connections.returnWhenIsConnected(connectionRecord.id)

    // Create observable for Response Received event
    const observable = agent.events.observable<DummyStateChangedEvent>(DummyEventTypes.StateChanged)
    const subject = new ReplaySubject<DummyRecord>(1)

    observable
        .pipe(
            filter((event: DummyStateChangedEvent) => event.payload.dummyRecord.state === DummyState.ResponseReceived),
            map((e) => e.payload.dummyRecord),
            first(),
            timeout(5000)
        )
        .subscribe(subject)

    // // Send a dummy request and wait for response
    // const record = await dummyModule.request(connectionRecord.id)
    // agent.config.logger.info(`Request received for Dummy Record: ${record.id}`)

    // const dummyRecord = await firstValueFrom(subject)
    // agent.config.logger.info(`Response received for Dummy Record: ${dummyRecord.id}`)

    // await agent.shutdown()
}

void run()
