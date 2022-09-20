import { BigInt, BigDecimal } from '@graphprotocol/graph-ts';
import { ZERO_BI, ONE_BI } from './utils/constants'
import {
    Enter,
    Unstake,
    Migrate,
    Claim,
    AddRewards
} from '../../generated/Staker/Staker';
import { Stake, Factory, History } from '../../generated/schema';
import { log } from '@graphprotocol/graph-ts'

export function EnterHandler(event: Enter): void{
    // update factory entity
    let factory = Factory.load(event.address.toHexString()); 
    if (factory){
        factory.currentStakedAmount += event.params.amount;
        factory.stakesCount += ONE_BI;

    }
    else{
        factory = new Factory(event.address.toHexString());
        factory.currentStakedAmount += event.params.amount;
        factory.rewardsAdded = ZERO_BI;
        factory.stakesCount = ONE_BI;
        factory.migrationsCount = ZERO_BI;
        factory.sumOfMultipliers = ZERO_BI;
    }
    // update stake entity
    let stake = new Stake(event.params.tokenId.toString());
    stake.stakedALGBAmount = event.params.amount;
    stake.lockPeriod = event.params.lockTime;
    stake.lockStartTime = event.block.timestamp;
    stake.multiplier = getMultiplier(event.params.lockTime); 
    factory.sumOfMultipliers += stake.multiplier;
    // update history
    const day = (event.block.timestamp.toI32() / 86400).toString();
    let history = History.load(day);
    if(history){
        history.dayStakedAmount += event.params.amount;
        history.stakedAmount = factory.currentStakedAmount;
        history.stakesCount = factory.stakesCount;
        history.dayStakesCount += ONE_BI;
    }
    else{
        history = new History(day);
        history.dayStakedAmount = event.params.amount;
        history.stakedAmount = factory.currentStakedAmount;
        history.dayRewardsAdded = ZERO_BI;
        history.rewardsAdded = factory.rewardsAdded;
        history.dayStakesCount = ONE_BI;
        history.stakesCount = factory.stakesCount;
    } 
    history.save();
    stake.save();
    factory.save();
}

export function UnstakeHandler(event: Unstake): void{
    let factory = Factory.load(event.address.toHexString());
    factory!.currentStakedAmount -= event.params.amount;
    factory!.stakesCount -= ONE_BI;
    
    
    let stake = Stake.load(event.params.tokenId.toString()) 
    stake!.stakedALGBAmount = ZERO_BI;
    factory!.sumOfMultipliers -= stake!.multiplier;

    const day = (event.block.timestamp.toI32() / 86400).toString();
    let history = History.load(day);
    if(history){
        history.stakedAmount = factory!.currentStakedAmount;
        history.stakesCount = factory!.stakesCount;
    }
    else{
        history = new History(day);
        history.dayStakedAmount = ZERO_BI;
        history.stakedAmount = factory!.currentStakedAmount;
        history.dayRewardsAdded = ZERO_BI;
        history.rewardsAdded = factory!.rewardsAdded;
        history.dayStakesCount = ZERO_BI;
        history.stakesCount = factory!.stakesCount;
    } 
    history.save();
    factory!.save();
    stake!.save();
}

export function MigrateHandler(event: Migrate): void{
    // update factory entity
    let factory = Factory.load(event.address.toHexString()); 
    if (factory){
        factory.currentStakedAmount += event.params.amount;
        factory.stakesCount += ONE_BI;
        factory.migrationsCount += ONE_BI;
    }
    else{
        factory = new Factory(event.address.toHexString());
        factory.currentStakedAmount += event.params.amount;
        factory.rewardsAdded = ZERO_BI;
        factory.stakesCount = ONE_BI;
        factory.migrationsCount = ONE_BI;
        factory.sumOfMultipliers = ZERO_BI;
    }
    // update stake entity
    let stake = new Stake(event.params.tokenId.toString());
    stake.stakedALGBAmount = event.params.amount;
    stake.lockPeriod = event.params.lockTime;
    stake.lockStartTime = event.block.timestamp;
    stake.multiplier = getMultiplier(event.params.lockTime); 
    factory.sumOfMultipliers += stake.multiplier;

    // update history
    const day = (event.block.timestamp.toI32() / 86400).toString();
    let history = History.load(day);
    if(history){
        history.dayStakedAmount += event.params.amount;
        history.stakedAmount = factory.currentStakedAmount;
        history.stakesCount = factory.stakesCount;
        history.dayStakesCount += ONE_BI;
    }
    else{
        history = new History(day);
        history.dayStakedAmount = event.params.amount;
        history.stakedAmount = factory.currentStakedAmount;
        history.dayRewardsAdded = ZERO_BI;
        history.rewardsAdded = factory.rewardsAdded;
        history.dayStakesCount = ONE_BI;
        history.stakesCount = factory.stakesCount;
    } 
    history.save();
    stake.save();
    factory.save();
}

export function AddRewardsHandler(event: AddRewards): void{
    let factory = Factory.load(event.address.toHexString());
    factory!.rewardsAdded += event.params.amount; 
    const day = (event.block.timestamp.toI32() / 86400).toString();
    let history = History.load(day);
    if(history){
        history.rewardsAdded = factory!.rewardsAdded;
        history.dayRewardsAdded += event.params.amount;
    }
    else{
        history = new History(day);
        history.dayStakedAmount = ZERO_BI;
        history.stakedAmount = factory!.currentStakedAmount;
        history.dayRewardsAdded = ONE_BI;
        history.rewardsAdded = factory!.rewardsAdded;
        history.dayStakesCount = ZERO_BI;
        history.stakesCount = factory!.stakesCount;
    }
    history.save();
    factory!.save(); 
} 

export function ClaimHandler(event: Claim): void{
    let factory = Factory.load(event.address.toHexString());
    factory!.rewardsCollected += event.params.amount;
    
    let stake = Stake.load(event.params.tokenId.toString());
    stake!.rewardsCollected += event.params.amount;
    
    factory!.save();
    stake!.save();
}

function getMultiplier(lockTime: BigInt): BigInt{

    switch(lockTime.toU32()){
        case 120: {
            return ONE_BI;
        }
        case 300: {
            return BigInt.fromI32(3);
        }
        case 420: {
            return BigInt.fromI32(6);
        }
        case 600: {
            return BigInt.fromI32(12);
        }
        default:{
            return ZERO_BI;
        }
    }
} 