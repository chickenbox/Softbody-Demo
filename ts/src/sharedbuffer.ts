namespace hahaApp {

    declare class SharedArrayBuffer extends ArrayBuffer {}

    export class SharedBufferTest{

        wait( t: number ) {
            return new Promise( (resolve, reject)=>{
                setTimeout(resolve, t*1000)
            })
        }

        async run(){
            const sharedArrBuf = new SharedArrayBuffer(4)
            const view = new Float32Array(sharedArrBuf)
            view[0] = 123

            const workerSource = `

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

            `
            const blob = new Blob([workerSource])
            const url = URL.createObjectURL(blob)
            const worker = new Worker(url)
            worker.onmessage = msg=>{
                if( msg.data.showValue!==undefined ){
                    console.log("value at: "+msg.data.showValue+" = "+view[msg.data.showValue])
                }
            }

            worker.postMessage( {
                buffer: sharedArrBuf
            } )
            worker.postMessage( {
                showValue: 0
            } )
            
            await this.wait(1)
            view[0] = 456
            worker.postMessage( {
                showValue: 0
            } )

            await this.wait(1)
            worker.postMessage( {
                startTest2: 1
            } )
        }

    }

}