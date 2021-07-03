const app = require('./app')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')

const port = process.env.PORT || 3000

const server = http.createServer(app)
const io = socketio(server)

// server (emit) -> client (receive) - message
// client (emit) -> server (receive) - sendMessage

let count = 0

io.on('connection', (socket) => {
    console.log('New Web Socket Connection')

    socket.on('join', (options, callback) => {
        
        const {error, user} = addUser({ id: socket.id, ...options })
        console.log('user: ', user);

        if(error){
            return callback(error)
        }
        
        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome !'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })


    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        const filter = new Filter()
        
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed!')
        }

        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (position, callback) => {
        const user = getUser(socket.id)
        
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://www.google.com/maps?q=${position.latitude},${position.longtitude}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        
        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () =>{
    console.log(`Server is up on port ${port}`)
})