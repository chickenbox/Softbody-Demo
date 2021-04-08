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

            const worker = new Worker("./script/worker.js")
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