type Listener = (balance: number) => void
 
const listeners = new Set<Listener>()
 
//call after any response that carries an authoritative coinBalance
export function publishCoinBalance(balance: number) {
	for (const listener of listeners) {
		listener(balance)
	}
}
 
export function subscribeToCoinBalance(listener: Listener) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}