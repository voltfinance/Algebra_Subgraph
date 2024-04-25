import { ethereum, Address, crypto, store, BigInt, BigDecimal } from '@graphprotocol/graph-ts';
import { ZERO_BI, stakerAddress, vaultAddress, ADDRESS_ZERO, oldVaultAddress } from './utils/constants'
import {
    Fill,
    Kill,
    Place,
    Withdraw
} from '../../generated/Limit/Limit';
import { Epoch, LimitOrder } from '../../generated/schema';

export function PlaceHandler(event: Place): void{
    let epoch = Epoch.load(event.params.epoch.toString());
    if (epoch == null){
        epoch = new Epoch(event.params.epoch.toString());
        epoch.pool =  event.params.pool;
        epoch.filled = false;
    }


    epoch.totalLiquidity += event.params.liquidity;
    epoch.save();

    let limit = LimitOrder.load(event.params.owner.toHexString() + "#" + event.params.epoch.toString())
    if( limit == null){
        limit = new LimitOrder(event.params.owner.toHexString() + "#" + event.params.epoch.toString())
        limit.owner = event.params.owner
        limit.pool = event.params.pool
        limit.tickLower = BigInt.fromI32(event.params.tickLower);
        limit.tickUpper = BigInt.fromI32(event.params.tickUpper);
        limit.zeroToOne = event.params.zeroForOne;
        limit.epoch = epoch.id;   
    }

    limit.liquidity += event.params.liquidity;
    limit.save();

}

export function FillHandler(event: Fill): void{
    let epoch = Epoch.load(event.params.epoch.toString())
    if(epoch != null){
        epoch.filled = true;
        epoch.save();
    }
}

export function KillHandler(event: Kill): void{
    let epoch = Epoch.load(event.params.epoch.toString())
    if( epoch != null){
        epoch.totalLiquidity -= event.params.liquidity;
        epoch.save();
    }

    let limit = LimitOrder.load(event.params.owner.toHexString() + "#" + event.params.epoch.toString())
    if( limit != null){
        limit.liquidity -= event.params.liquidity;
        limit.save();
    }

}

export function WithdrawHandler(event: Withdraw): void{
    let epoch = Epoch.load(event.params.epoch.toString())
    if( epoch != null){
        epoch.totalLiquidity -= event.params.liquidity;
        epoch.save();
    }

    let limit = LimitOrder.load(event.params.owner.toHexString() + "#" + event.params.epoch.toString())
    if( limit != null){
        limit.liquidity -= event.params.liquidity;
        limit.save();
    }
}
