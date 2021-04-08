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

        constructor(
            private sab: ArrayBuffer
        ){
            this.view = new Int32Array(sab)
        }

        lock(){
            for(;;){
                if( Atomics.compareExchange( this.view, 0, unlocked, locked ) == unlocked ){
                    return
                }
                Atomics.wait(this.view,0,locked)
            }
        }

        tryLock(){
            if( Atomics.compareExchange( this.view, 0, unlocked, locked ) == unlocked ){
                return true
            }
            return false
        }

        unlock(){
            if( Atomics.compareExchange( this.view, 0, locked, unlocked) == locked ){                
                Atomics.notify(this.view,0,1)
            }else{
                throw new Error("Unlock a already unlocked mutex")
            }
        }
    }

}