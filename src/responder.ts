import type { DummyStateChangedEvent } from './dummy'
import type { Socket } from 'net'

import { Agent, ConsoleLogger, HttpOutboundTransport, LogLevel, MediatorPickupStrategy, WsOutboundTransport } from '@aries-framework/core'
import { agentDependencies, HttpInboundTransport, WsInboundTransport } from '@aries-framework/node'
import express from 'express'
import { Server } from 'ws'

import { DummyEventTypes, DummyModule, DummyState } from './dummy'

const run = async () => {
    // Create transports
    const port = process.env.RESPONDER_PORT ? Number(process.env.RESPONDER_PORT) : 3002
    const app = express()
    const socketServer = new Server({ noServer: true })

    const httpInboundTransport = new HttpInboundTransport({ app, port })
    const httpOutboundTransport = new HttpOutboundTransport()
    const wsInboundTransport = new WsInboundTransport({ server: socketServer })
    const wsOutboundTransport = new WsOutboundTransport()
    // const mediatorConnectionsInviteUrl = "http://192.168.1.57:3008?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiMTUwNWM2YzAtNzZiOC00OTk1LTk0NWEtY2IyYmM5YzQ0ODc4IiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwOi8vMTkyLjE2OC4xLjU3OjMwMDgiLCAicmVjaXBpZW50S2V5cyI6IFsiNkZuaG4yUHVhdGNhVUhiMkdaQ1o3S0dYQWk4YWd0NjZIaEpDZjR4OWRMcUYiXSwgImxhYmVsIjogIk1lZGlhdG9yIn0="
    const mediatorConnectionsInviteUrl = "https://public.mediator.indiciotech.io/?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiMDVlYzM5NDItYTEyOS00YWE3LWEzZDQtYTJmNDgwYzNjZThhIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3B1YmxpYy5tZWRpYXRvci5pbmRpY2lvdGVjaC5pbyIsICJyZWNpcGllbnRLZXlzIjogWyJDc2dIQVpxSktuWlRmc3h0MmRIR3JjN3U2M3ljeFlEZ25RdEZMeFhpeDIzYiJdLCAibGFiZWwiOiAiSW5kaWNpbyBQdWJsaWMgTWVkaWF0b3IifQ=="
    // Setup the agent
    const agent = new Agent(
        {
            label: 'Dummy-powered agent - responder',
            // endpoints: [`ws://localhost:${port}`],
            walletConfig: {
                id: 'responder1',
                key: 'responder1',
            },
            // indyLedgers: [

            // ],
            logger: new ConsoleLogger(LogLevel.test),
            autoAcceptConnections: true,
            // mediatorPickupStrategy: MediatorPickupStrategy.None,
            mediatorConnectionsInvite: mediatorConnectionsInviteUrl,
            autoAcceptMediationRequests: true,
        },
        agentDependencies
    )

    // Register transports
    agent.registerInboundTransport(httpInboundTransport)
    agent.registerOutboundTransport(httpOutboundTransport);
    agent.registerInboundTransport(wsInboundTransport)
    agent.registerOutboundTransport(wsOutboundTransport)

    // Allow to create invitation, no other way to ask for invitation yet
    app.get('/invitation', async (req, res) => {
        const { outOfBandInvitation } = await agent.oob.createInvitation()
        res.send(outOfBandInvitation.toUrl({ domain: `http://localhost:${port}/invitation` }))
    })

    // Inject DummyModule
    const dummyModule = agent.injectionContainer.resolve(DummyModule)

    // Now agent will handle messages and events from Dummy protocol

    //Initialize the agent
    await agent.initialize()

    httpInboundTransport.server?.on('upgrade', (request, socket, head) => {
        socketServer.handleUpgrade(request, socket as Socket, head, (socket) => {
            socketServer.emit('connection', socket, request)
        })
    })

    // Subscribe to dummy record events
    agent.events.on(DummyEventTypes.StateChanged, async (event: DummyStateChangedEvent) => {
        if (event.payload.dummyRecord.state === DummyState.RequestReceived) {
            await dummyModule.respond(event.payload.dummyRecord.id)
        }
    })

    agent.config.logger.info(`Responder listening to port ${port}`)
}

void run()
