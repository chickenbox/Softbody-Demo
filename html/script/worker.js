console.log("Start Worker");
let view;
onmessage = msg => {
    if (msg.data.buffer) {
        view = new Float32Array(msg.data.buffer);
        console.log("received shared buffer");
    }
    else if (msg.data.showValue !== undefined) {
        console.log("value at: " + msg.data.showValue + " = " + view[msg.data.showValue]);
    }
    else if (msg.data.startTest2 !== undefined) {
        view[0] = 789;
        postMessage({
            showValue: 0
        });
    }
};
var hahaApp;
(function (hahaApp) {
    const locked = 0;
    const unlocked = 1;
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
            return true;
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
