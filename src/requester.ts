import { DummyRecord, DummyRequestMessage, DummyStateChangedEvent } from './dummy'

import { Agent, AriesFrameworkError, ConnectionRecord, ConsoleLogger, HttpOutboundTransport, LogLevel, MediatorPickupStrategy, WsOutboundTransport } from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import { filter, first, firstValueFrom, map, ReplaySubject, timeout } from 'rxjs'
import express from 'express'

import { DummyEventTypes, DummyModule, DummyState } from './dummy'

const bcovrin = `{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node1","blskey":"4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba","blskey_pop":"RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1","client_ip":"138.197.138.255","client_port":9702,"node_ip":"138.197.138.255","node_port":9701,"services":["VALIDATOR"]},"dest":"Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"},"metadata":{"from":"Th7MpTaRZVRYnPiabds81Y"},"type":"0"},"txnMetadata":{"seqNo":1,"txnId":"fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node2","blskey":"37rAPpXVoxzKhz7d9gkUe52XuXryuLXoM6P6LbWDB7LSbG62Lsb33sfG7zqS8TK1MXwuCHj1FKNzVpsnafmqLG1vXN88rt38mNFs9TENzm4QHdBzsvCuoBnPH7rpYYDo9DZNJePaDvRvqJKByCabubJz3XXKbEeshzpz4Ma5QYpJqjk","blskey_pop":"Qr658mWZ2YC8JXGXwMDQTzuZCWF7NK9EwxphGmcBvCh6ybUuLxbG65nsX4JvD4SPNtkJ2w9ug1yLTj6fgmuDg41TgECXjLCij3RMsV8CwewBVgVN67wsA45DFWvqvLtu4rjNnE9JbdFTc1Z4WCPA3Xan44K1HoHAq9EVeaRYs8zoF5","client_ip":"138.197.138.255","client_port":9704,"node_ip":"138.197.138.255","node_port":9703,"services":["VALIDATOR"]},"dest":"8ECVSk179mjsjKRLWiQtssMLgp6EPhWXtaYyStWPSGAb"},"metadata":{"from":"EbP4aYNeTHL6q385GuVpRV"},"type":"0"},"txnMetadata":{"seqNo":2,"txnId":"1ac8aece2a18ced660fef8694b61aac3af08ba875ce3026a160acbc3a3af35fc"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node3","blskey":"3WFpdbg7C5cnLYZwFZevJqhubkFALBfCBBok15GdrKMUhUjGsk3jV6QKj6MZgEubF7oqCafxNdkm7eswgA4sdKTRc82tLGzZBd6vNqU8dupzup6uYUf32KTHTPQbuUM8Yk4QFXjEf2Usu2TJcNkdgpyeUSX42u5LqdDDpNSWUK5deC5","blskey_pop":"QwDeb2CkNSx6r8QC8vGQK3GRv7Yndn84TGNijX8YXHPiagXajyfTjoR87rXUu4G4QLk2cF8NNyqWiYMus1623dELWwx57rLCFqGh7N4ZRbGDRP4fnVcaKg1BcUxQ866Ven4gw8y4N56S5HzxXNBZtLYmhGHvDtk6PFkFwCvxYrNYjh","client_ip":"138.197.138.255","client_port":9706,"node_ip":"138.197.138.255","node_port":9705,"services":["VALIDATOR"]},"dest":"DKVxG2fXXTU8yT5N7hGEbXB3dfdAnYv1JczDUHpmDxya"},"metadata":{"from":"4cU41vWW82ArfxJxHkzXPG"},"type":"0"},"txnMetadata":{"seqNo":3,"txnId":"7e9f355dffa78ed24668f0e0e369fd8c224076571c51e2ea8be5f26479edebe4"},"ver":"1"}
{"reqSignature":{},"txn":{"data":{"data":{"alias":"Node4","blskey":"2zN3bHM1m4rLz54MJHYSwvqzPchYp8jkHswveCLAEJVcX6Mm1wHQD1SkPYMzUDTZvWvhuE6VNAkK3KxVeEmsanSmvjVkReDeBEMxeDaayjcZjFGPydyey1qxBHmTvAnBKoPydvuTAqx5f7YNNRAdeLmUi99gERUU7TD8KfAa6MpQ9bw","blskey_pop":"RPLagxaR5xdimFzwmzYnz4ZhWtYQEj8iR5ZU53T2gitPCyCHQneUn2Huc4oeLd2B2HzkGnjAff4hWTJT6C7qHYB1Mv2wU5iHHGFWkhnTX9WsEAbunJCV2qcaXScKj4tTfvdDKfLiVuU2av6hbsMztirRze7LvYBkRHV3tGwyCptsrP","client_ip":"138.197.138.255","client_port":9708,"node_ip":"138.197.138.255","node_port":9707,"services":["VALIDATOR"]},"dest":"4PS3EDQ3dW1tci1Bp6543CfuuebjFrg36kLAUcskGfaA"},"metadata":{"from":"TWwCRQRZ2ZHMJFn9TzLp7W"},"type":"0"},"txnMetadata":{"seqNo":4,"txnId":"aa5e817d7cc626170eca175822029339a444eb0ee8f0bd20d3b0b76e566fb008"},"ver":"1"}`

const run = async () => {
    // Create transports
    // const port = process.env.RESPONDER_PORT ? Number(process.env.RESPONDER_PORT) : 3002
    // const port = process.env.RESPONDER_PORT ? Number(process.env.RESPONDER_PORT) : 3008
    const requesterPort = process.env.REQUESTER_PORT ? Number(process.env.REQUESTER_PORT) : 3003
    const app = express()
    const mediatorConnectionsInviteUrl ="https://public.mediator.indiciotech.io/?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiMDVlYzM5NDItYTEyOS00YWE3LWEzZDQtYTJmNDgwYzNjZThhIiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3B1YmxpYy5tZWRpYXRvci5pbmRpY2lvdGVjaC5pbyIsICJyZWNpcGllbnRLZXlzIjogWyJDc2dIQVpxSktuWlRmc3h0MmRIR3JjN3U2M3ljeFlEZ25RdEZMeFhpeDIzYiJdLCAibGFiZWwiOiAiSW5kaWNpbyBQdWJsaWMgTWVkaWF0b3IifQ=="
    // const mediatorConnectionsInviteUrl = "http://192.168.1.57:3008?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiMTUwNWM2YzAtNzZiOC00OTk1LTk0NWEtY2IyYmM5YzQ0ODc4IiwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwOi8vMTkyLjE2OC4xLjU3OjMwMDgiLCAicmVjaXBpZW50S2V5cyI6IFsiNkZuaG4yUHVhdGNhVUhiMkdaQ1o3S0dYQWk4YWd0NjZIaEpDZjR4OWRMcUYiXSwgImxhYmVsIjogIk1lZGlhdG9yIn0="
    // Setup the agent
    const agent = new Agent(
        {
            label: 'Dummy-powered agent - requester',
            walletConfig: {
                id: 'requester1',
                key: 'requester1',
            },
            indyLedgers: [
                {
                    genesisTransactions: bcovrin,
                    id: 'greenlightskfs',
                    isProduction: false,
                  },
            ],
            logger: new ConsoleLogger(LogLevel.test),
            autoAcceptConnections: true,
            mediatorConnectionsInvite: mediatorConnectionsInviteUrl,
        },
        agentDependencies
    )
    // let connectionRecord: ConnectionRecord | null = null;
    let connectionRecordId = ""
    app.get("/message", async (req, res) => {
        try {
            const message = req.query.message as string
            // Send a dummy request and wait for response
            const msg = new DummyRequestMessage({})
            msg.message = message
            const record = await dummyModule.request(msg, connectionRecordId)
            agent.config.logger.info(`Request received for Dummy Record: ${record.id}`)
            const observable = agent.events.observable<DummyStateChangedEvent>(DummyEventTypes.StateChanged)

            observable
                .pipe(
                    filter((event: DummyStateChangedEvent) => event.payload.dummyRecord.state === DummyState.ResponseReceived),
                    map((e) => e.payload.dummyRecord),
                    first(),
                    timeout(5000)
                )
                .subscribe(subject)
            const dummyRecord = await firstValueFrom(subject)
            agent.config.logger.info(`Response received for Dummy Record: ${dummyRecord.id}`)

            res.send(JSON.stringify({ dummyRecord, record }, null, 4))
            // res.send("LMAO")
        } catch (e) {
            console.log(e);
            res.send(e.toString())
        }
    })
    app.get("/receive-invitation", async (req, res) => {
        try {
            const url = req.query.url as string
            const r = await agent.oob.receiveInvitationFromUrl(url)
            const connectionRecord = r.connectionRecord
            if (!connectionRecord) {
                throw new AriesFrameworkError('Connection record for out-of-band invitation was not created.')
            }
            connectionRecordId = connectionRecord.id
            await agent.connections.returnWhenIsConnected(connectionRecord.id)

            res.send(JSON.stringify({ connectionRecord }, null, 4))
        } catch (e) {
            console.log(e);
            res.send(e.toString())
        }
    })
    app.listen(requesterPort, "0.0.0.0", () => {
        console.log(`Requester listening on port ${requesterPort}`)
    })
    // Register transports
    const wsOutboundTransport = new WsOutboundTransport()
    const httpOutboundTransport = new HttpOutboundTransport()
    agent.registerOutboundTransport(wsOutboundTransport)
    agent.registerOutboundTransport(httpOutboundTransport)

    // Inject DummyModule
    const dummyModule = agent.injectionContainer.resolve(DummyModule)

    // Now agent will handle messages and events from Dummy protocol

    //Initialize the agent
    await agent.initialize()
    // agent.mediator.connectionService.createConnection({ invitationDid: "" })
    // // Connect to responder using its invitation endpoint
    // const invitationUrl = await (await agentDependencies.fetch(`http://localhost:${port}/invitation`)).text()
    // const { connectionRecord } = await agent.oob.receiveInvitationFromUrl(invitationUrl)
    // if (!connectionRecord) {
    //     throw new AriesFrameworkError('Connection record for out-of-band invitation was not created.')
    // }
    // await agent.connections.returnWhenIsConnected(connectionRecord.id)

    // // Create observable for Response Received event

    const subject = new ReplaySubject<DummyRecord>(1)


    // // Send a dummy request and wait for response
    // const record = await dummyModule.request(connectionRecord.id)
    // agent.config.logger.info(`Request received for Dummy Record: ${record.id}`)

    // const dummyRecord = await firstValueFrom(subject)
    // agent.config.logger.info(`Response received for Dummy Record: ${dummyRecord.id}`)

    // await agent.shutdown()
}

void run()
