console.log("Start Worker");
let view;
let mutex;
onmessage = msg => {
    if (msg.data.buffer) {
        view = new Float32Array(msg.data.buffer);
        mutex = new hahaApp.Mutex(msg.data.buffer);
        console.log("received shared buffer");
    }
    else if (msg.data.showValue !== undefined) {
        console.log("value at: " + msg.data.showValue + " = " + view[msg.data.showValue]);
    }
    else if (msg.data.startTest2 !== undefined) {
        view[1] = 789;
        postMessage({
            showValue: 1
        });
        postMessage({
            startTest3: 1
        });
    }
    else if (msg.data.tryLockMutex) {
        console.log("Try Lock: ");
        mutex.lock();
        console.log("Try Locked: ");
        mutex.unlock();
        console.log("Try Unlocked: ");
    }
};
var hahaApp;
(function (hahaApp) {
    const unlocked = 0;
    const locked = 1;
    class Mutex {
        constructor(sab) {
            this.sab = sab;
            this.view = new Int32Array(sab);
        }
        lock() {
            for (;;) {
                if (Atomics.compareExchange(this.view, 0, unlocked, locked) == unlocked) {
                    return;
                }
                Atomics.wait(this.view, 0, locked);
            }
        }
        tryLock() {
            if (Atomics.compareExchange(this.view, 0, unlocked, locked) == unlocked) {
                return true;
            }
            return false;
        }
        unlock() {
            if (Atomics.compareExchange(this.view, 0, locked, unlocked) == locked) {
                Atomics.notify(this.view, 0, 1);
            }
            else {
                throw new Error("Unlock a already unlocked mutex");
            }
        }
    }
    hahaApp.Mutex = Mutex;
})(hahaApp || (hahaApp = {}));
