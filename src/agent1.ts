/**
 * This file contains a sample mediator. The mediator supports both
 * HTTP and WebSockets for communication and will automatically accept
 * incoming mediation requests.
 *
 * You can get an invitation by going to '/invitation', which by default is
 * http://localhost:3001/invitation
 *
 * To connect to the mediator from another agent, you can set the
 * 'mediatorConnectionsInvite' parameter in the agent config to the
 * url that is returned by the '/invitation/ endpoint. This will connect
 * to the mediator, request mediation and set the mediator as default.
 */

import { Agent, AgentConfig, AgentDependencies, HttpOutboundTransport, InitConfig, OutOfBandInvitation, WsOutboundTransport } from '@aries-framework/core'
import { HttpInboundTransport, WsInboundTransport } from '@aries-framework/node'
import { EventEmitter } from 'events'
import express from 'express'
import * as indy from 'indy-sdk'
import type { Socket } from 'net'
import fetch from 'node-fetch'
import path from "path"
import WebSocket, { Server } from 'ws'
import { NodeFileSystem } from './NodeFileSystem'



const port = process.env.AGENT_PORT ? Number(process.env.AGENT_PORT) : 3002

// We create our own instance of express here. This is not required
// but allows use to use the same server (and port) for both WebSockets and HTTP
const app = express()
const socketServer = new Server({ noServer: true })

const endpoints = process.env.AGENT_ENDPOINTS?.split(',') ?? [`http://localhost:${port}`, `ws://localhost:${port}`]

//  const logger = new TestLogger(LogLevel.info)

const agentConfig: InitConfig = {
    endpoints,
    label: process.env.AGENT_LABEL || 'Aries Framework JavaScript Mediator Agent1',
    walletConfig: {
        id: process.env.WALLET_NAME || 'AriesFrameworkJavaScript Agent1',
        key: process.env.WALLET_KEY || 'AriesFrameworkJavaScript Agent1',
    },
    autoAcceptConnections: true,
    autoAcceptMediationRequests: true,
    logger: console as any,
}

process.env.BASE_PATH = path.join(`${process.cwd()}/agent1`)
const agentDependencies: AgentDependencies = {
    FileSystem: NodeFileSystem,
    fetch,
    EventEmitterClass: EventEmitter,
    WebSocketClass: WebSocket,
    indy,
}

// Set up agent
const agent = new Agent(agentConfig, agentDependencies)
const config = agent.injectionContainer.resolve(AgentConfig)

// Create all transports
const httpInboundTransport = new HttpInboundTransport({ app, port })
const httpOutboundTransport = new HttpOutboundTransport()
const wsInboundTransport = new WsInboundTransport({ server: socketServer })
const wsOutboundTransport = new WsOutboundTransport()

// Register all Transports
agent.registerInboundTransport(httpInboundTransport)
agent.registerOutboundTransport(httpOutboundTransport)
agent.registerInboundTransport(wsInboundTransport)
agent.registerOutboundTransport(wsOutboundTransport)

// Allow to create invitation, no other way to ask for invitation yet
httpInboundTransport.app.get('/invitation', async (req, res) => {
    if (typeof req.query.oob === 'string') {

        const invitation = await OutOfBandInvitation.fromUrl(req.url)
        res.send(invitation.toJSON())
    } else {
        const inv = await agent.oob.createInvitation()
        const { outOfBandInvitation } = inv
        const httpEndpoint = config.endpoints.find((e) => e.startsWith('http'))
        const invitationURL = outOfBandInvitation.toUrl({ domain: httpEndpoint + '/invitation' })
        res.send(invitationURL)
    }
})
httpInboundTransport.app.get('/invitation/:id', async (req, res) => {
    try {
        const inv = await agent.oob.findByInvitationId(req.params.id)
        if (!inv) {
            res.send(`Invitation with id ${req.params.id} not found`)
        } else {
            res.send(inv.toJSON())
        }
    } catch (e) {
        res.send(e.toString())
    }
})
httpInboundTransport.app.get('/invitation/:id/accept', async (req, res) => {
    try {
        const inv = await agent.oob.findByInvitationId(req.params.id)
        console.log(inv);
        console.log(req.params.id);
        res.send(inv.toJSON())
    } catch (e) {
        res.send(e.toString())
    }
})

// Allow to create invitation, no other way to ask for invitation yet
httpInboundTransport.app.get('/receive-invitation', async (req, res) => {
    try {
        const url = req.query.url as string;
        console.log(url);
        const inv = await agent.oob.receiveInvitationFromUrl(url, { autoAcceptConnection: true, autoAcceptInvitation: true });
        // const inv2 = await agent.oob.findByInvitationId(inv.outOfBandRecord.id);
        res.send(inv.outOfBandRecord.toJSON());
    } catch (e) {
        res.send(e.toString());
    }
})

const run = async () => {
    await agent.initialize()

    // When an 'upgrade' to WS is made on our http server, we forward the
    // request to the WS server
    httpInboundTransport.server?.on('upgrade', (request, socket, head) => {
        socketServer.handleUpgrade(request, socket as Socket, head, (socket) => {
            socketServer.emit('connection', socket, request)
        })
    })
}

void run()