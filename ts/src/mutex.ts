namespace hahaApp {


    declare class Atomics {
        static compareExchange( typedArray: ArrayLike<number>, index: number, expectedValue: number, replacementValue: number ): number
        static wait( typedArray: ArrayLike<number>, index: number, value: number ): string
        static notify( typedArray: ArrayLike<number>, index: number, count: number ): number
    }

    const unlocked = 0
    const locked = 1

    export class Mutex {

        private view: Int32Array
        private count = 0

        constructor(
            private sab: ArrayBuffer
        ){
            this.view = new Int32Array(sab)
        }

        lock(){
            if( this.count>0 ){
                this.count++
                return
            }
            for(;;){
                if( Atomics.compareExchange( this.view, 0, unlocked, locked ) == unlocked ){
                    this.count++
                    return
                }
                Atomics.wait(this.view,0,locked)
            }
        }

        tryLock(){
            if( this.count>0 ){
                this.count++
                return true
            }
            if( Atomics.compareExchange( this.view, 0, unlocked, locked ) == unlocked ){
                return true
            }
            return false
        }

        unlock(){
            this.count--
            if( this.count>0 )
                return
                
            if( Atomics.compareExchange( this.view, 0, locked, unlocked) == locked ){                
                Atomics.notify(this.view,0,1)
            }else{
                throw new Error("Unlock a already unlocked mutex")
            }
        }
    }

}