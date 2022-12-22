import {
  Lock
} from '../types/FarmingCenter/FarmingCenter'
import {  Deposit } from '../types/schema'


export function handleLock(event: Lock): void {

  let deposit = Deposit.load(event.params.tokenId.toString());

  if (deposit != null) {
    deposit.locked = event.params.lock;
    deposit.save();
  }
  
}

  