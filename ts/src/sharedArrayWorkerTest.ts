declare function postMessage( message: any )

console.log("Start Worker")

let view
onmessage = msg=>{
    if( msg.data.buffer ){
        view = new Float32Array(msg.data.buffer)
        console.log("received shared buffer")
    }else if( msg.data.showValue!==undefined ){
        console.log("value at: "+msg.data.showValue+" = "+view[msg.data.showValue])
    }else if( msg.data.startTest2!==undefined ){
        view[0] = 789
        postMessage({
            showValue: 0
        })
    }
}