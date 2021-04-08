namespace hahaApp {

    declare class SharedArrayBuffer extends ArrayBuffer {}

    export class SharedBufferTest{

        wait( t: number ) {
            return new Promise( (resolve, reject)=>{
                setTimeout(resolve, t*1000)
            })
        }

        async run(){
            const sharedArrBuf = new SharedArrayBuffer(8)
            const view = new Float32Array(sharedArrBuf)
            const mutex = new Mutex(sharedArrBuf)
            view[1] = 123

            const worker = new Worker("./script/worker.js")
            worker.onmessage = msg=>{
                if( msg.data.showValue!==undefined ){
                    console.log("value at: "+msg.data.showValue+" = "+view[msg.data.showValue])
                }else if( msg.data.startTest3 ){                    
                    mutex.lock()
                    console.log("locked in mainthread")
                    worker.postMessage({
                        tryLockMutex: 1
                    })
                    setTimeout(()=>{
                        console.log("unlocked in mainthread")
                        mutex.unlock()
                        setTimeout(()=>{
                            console.log("lock again in mainthread")
                            mutex.lock()
                            mutex.unlock()
                            console.log("Complete")
                        }, 1000)
                    }, 1000)
                }
            }

            worker.postMessage( {
                buffer: sharedArrBuf
            } )
            worker.postMessage( {
                showValue: 1
            } )
            
            await this.wait(1)
            view[1] = 456
            worker.postMessage( {
                showValue: 1
            } )

            await this.wait(1)
            worker.postMessage( {
                startTest2: 1
            } )
        }

    }

}