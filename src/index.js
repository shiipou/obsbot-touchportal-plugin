const osc = require('osc')
const tp = require('touchportal-api')
const pluginId = 'OBSBotController'

const tpClient = new tp.Client(pluginId)

let oscPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121,
    remoteAddress: "127.0.0.1",
    remotePort: 57120
})

oscPort.open()

tpClient.on("info", (message) => {
    console.log("Connected to TouchPortal, setting up State and Action descriptors")
    // Read config.yaml and create the states and actions for each OSC Message you want to send.
    fs.readFile('config.yaml', 'utf8', (err, data) => {
        if (err) {
            console.log(err)
            return
        }
        let config = yaml.load(data)
        for (let command of config.commands.control) {
            tpClient.createAction(pluginId, command.name, command.name, [], [{name: command.name, value: 'Connected'}])
        }
        for (let command of config.commands.information) {
            tpClient.createState(pluginId, command.name, command.name, 'Disconnected', 'Connected', 'Disconnected')
        }
    })
    oscPort.send({address: "/OBSBOT/WebCam/General/Connected", args: []})
})

tpClient.on("action", (message) => {
    console.log("Received action: ", message)
    switch(message.actionId) {
        case 'connect':
            oscPort.send({address: "/OBSBOT/WebCam/General/Connected", args: []})
            break
        case 'disconnect':
            oscPort.send({address: "/OBSBOT/WebCam/General/Disconnected", args: []})
            break
        // Add a case for each action you have created. The OSC message can be sent using the oscPort.send method.
    }
})

tpClient.connect()
