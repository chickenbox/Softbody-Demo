declare function postMessage( message: any )

console.log("Start Worker")

let view: Float32Array
let mutex: hahaApp.Mutex
onmessage = msg=>{
    if( msg.data.buffer ){
        view = new Float32Array(msg.data.buffer)
        mutex = new hahaApp.Mutex(msg.data.buffer)
        console.log("received shared buffer")
    }else if( msg.data.showValue!==undefined ){
        console.log("value at: "+msg.data.showValue+" = "+view[msg.data.showValue])
    }else if( msg.data.startTest2!==undefined ){
        view[1] = 789
        postMessage({
            showValue: 1
        })

        postMessage({
            startTest3: 1
        })
    }else if( msg.data.tryLockMutex ){
        console.log( "Try Lock: " )
        mutex.lock()
        console.log( "Try Locked: " )
        mutex.unlock()
        console.log( "Try Unlocked: " )
    }
}