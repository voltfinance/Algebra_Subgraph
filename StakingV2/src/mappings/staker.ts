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
        factory.sumOfMultipliers = BigDecimal.fromString("0");
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
    if(stake) stake.stakedALGBAmount = ZERO_BI;
    factory!.sumOfMultipliers -= stake!.multiplier;

    const day = (event.block.timestamp.toI32() / 86400).toString();
    let history = History.load(day);
    if(history){
        history.stakedAmount = factory!.currentStakedAmount;
        history.date = event.block.timestamp;
        history.stakesCount = factory!.stakesCount;
    }
    else{
        history = new History(day);
        history.date = event.block.timestamp;
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
        factory.sumOfMultipliers = BigDecimal.fromString("0");
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
        history.date = event.block.timestamp;
        history.stakedAmount = factory.currentStakedAmount;
        history.stakesCount = factory.stakesCount;
        history.dayStakesCount += ONE_BI;
    }
    else{
        history = new History(day);
        history.dayStakedAmount = event.params.amount;
        history.date = event.block.timestamp;
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
    if (factory){
        factory.rewardsAdded += event.params.amount;
    }
    else{
        factory = new Factory(event.address.toHexString());
        factory.currentStakedAmount = ZERO_BI;
        factory.rewardsAdded = event.params.amount;
        factory.stakesCount = ZERO_BI;
        factory.migrationsCount = ZERO_BI;
        factory.sumOfMultipliers = BigDecimal.fromString("0");
    }
    const day = (event.block.timestamp.toI32() / 86400).toString();
    let history = History.load(day);
    if(history){
        history.date = event.block.timestamp;
        history.rewardsAdded = factory.rewardsAdded;
        history.dayRewardsAdded += event.params.amount;
    }
    else{
        history = new History(day);
        history.date = event.block.timestamp;
        history.dayStakedAmount = ZERO_BI;
        history.stakedAmount = factory.currentStakedAmount;
        history.dayRewardsAdded = ONE_BI;
        history.rewardsAdded = factory.rewardsAdded;
        history.dayStakesCount = ZERO_BI;
        history.stakesCount = factory.stakesCount;
    }
    history.save();
    factory.save(); 
} 

export function ClaimHandler(event: Claim): void{
    let factory = Factory.load(event.address.toHexString());
    factory!.rewardsCollected += event.params.amount;
    
    let stake = Stake.load(event.params.tokenId.toString());
    stake!.rewardsCollected += event.params.amount;
    
    factory!.save();
    stake!.save();
}

function getMultiplier(lockTime: BigInt): BigDecimal{

    switch(lockTime.toU32()){
        case 120: {
            return BigDecimal.fromString("1");
        }
        case 300: {
            return BigDecimal.fromString("1.2");
        }
        case 420: {
            return BigDecimal.fromString("1.5");
        }
        case 500: {
            return BigDecimal.fromString("2");
        }
        case 600: {
            return BigDecimal.fromString("2.5");
        }
        default:{
            return BigDecimal.fromString("0");
        }
    }
} 