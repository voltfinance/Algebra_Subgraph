import { ethereum, crypto, BigInt, Bytes } from '@graphprotocol/graph-ts';
import {
  EternalFarmingCreated,
  FarmEntered,
  RewardAmountsDecreased,
  FarmEnded,
  RewardClaimed,
  IncentiveDeactivated,
  RewardsRatesChanged,
  RewardsAdded,
  RewardsCollected
} from '../types/EternalFarming/EternalFarming';
import { Deposit, Reward, EternalFarming } from '../types/schema';
import { createTokenEntity } from '../utils/token'

export function handleIncentiveCreated(event: EternalFarmingCreated): void {
  let incentiveIdTuple: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(event.params.rewardToken),
    ethereum.Value.fromAddress(event.params.bonusRewardToken),
    ethereum.Value.fromAddress(event.params.pool),
    ethereum.Value.fromUnsignedBigInt(event.params.nonce)
  ];

  createTokenEntity(event.params.rewardToken)
  createTokenEntity(event.params.bonusRewardToken)

  let _incentiveTuple = changetype<ethereum.Tuple>(incentiveIdTuple);

  let incentiveIdEncoded = ethereum.encode(
    ethereum.Value.fromTuple(_incentiveTuple)
  )!;
  let incentiveId = crypto.keccak256(incentiveIdEncoded);

  let entity = EternalFarming.load(Bytes.fromUTF8(incentiveId.toHex()));
  if (entity == null) {
    entity = new EternalFarming(Bytes.fromUTF8(incentiveId.toHex()));
    entity.reward = BigInt.fromString("0");
    entity.bonusReward = BigInt.fromString("0");
    entity.rewardRate = BigInt.fromString("0");
    entity.bonusRewardRate = BigInt.fromString("0");
  }

  entity.rewardToken = event.params.rewardToken;
  entity.bonusRewardToken = event.params.bonusRewardToken;
  entity.pool = event.params.pool;
  entity.nonce = event.params.nonce;
  entity.virtualPool = event.params.virtualPool;

  entity.isDeactivated = false;
  entity.minRangeLength = BigInt.fromI32(event.params.minimalAllowedPositionWidth)
  entity.save();
}


export function handleTokenStaked(event: FarmEntered): void {
  let entity = Deposit.load(Bytes.fromUTF8(event.params.tokenId.toString()));
  if (entity != null) {
    entity.eternalFarming = event.params.incentiveId;
    entity.save();
  }

}

export function handleRewardClaimed(event: RewardClaimed): void {
  let id = event.params.rewardAddress.toHexString() + event.params.owner.toHexString();
  let rewardEntity = Reward.load(Bytes.fromUTF8(id));
  if (rewardEntity != null) {
    rewardEntity.owner = event.params.owner;
    rewardEntity.rewardAddress = event.params.rewardAddress;
    rewardEntity.amount = rewardEntity.amount.minus(event.params.reward);
    rewardEntity.save();
  }
}

export function handleTokenUnstaked(event: FarmEnded): void {

  let entity = Deposit.load(Bytes.fromUTF8(event.params.tokenId.toString()));

  if (entity) {
    let eternalFarming = EternalFarming.load(Bytes.fromUTF8(entity.eternalFarming!.toHexString()))

    if (eternalFarming) {
      eternalFarming.reward = eternalFarming.reward.minus(event.params.reward)
      eternalFarming.bonusReward = eternalFarming.bonusReward.minus(event.params.bonusReward)
      eternalFarming.save()
    }
  }

  if (entity != null) {
    entity.eternalFarming = null;
    entity.save();
  }

  let id = event.params.rewardAddress.toHexString() + event.params.owner.toHexString()
  let rewardEntity = Reward.load(Bytes.fromUTF8(id))

  if (rewardEntity == null) {
    rewardEntity = new Reward(Bytes.fromUTF8(id))
    rewardEntity.amount = BigInt.fromString('0')
  }

  rewardEntity.owner = event.params.owner
  rewardEntity.rewardAddress = event.params.rewardAddress
  rewardEntity.amount = rewardEntity.amount.plus(event.params.reward)
  rewardEntity.save();


  id = event.params.bonusRewardToken.toHexString() + event.params.owner.toHexString()
  rewardEntity = Reward.load(Bytes.fromUTF8(id))

  if (rewardEntity == null) {
    rewardEntity = new Reward(Bytes.fromUTF8(id))
    rewardEntity.amount = BigInt.fromString('0')
  }

  rewardEntity.owner = event.params.owner
  rewardEntity.rewardAddress = event.params.bonusRewardToken
  rewardEntity.amount = rewardEntity.amount.plus(event.params.bonusReward)
  rewardEntity.save();

}

export function handleDeactivate(event: IncentiveDeactivated): void {

  let entity = EternalFarming.load(Bytes.fromUTF8(event.params.incentiveId.toHexString()));

  if (entity) {
    entity.isDeactivated = true
    entity.save()
  }

}


export function handleRewardsRatesChanged(event: RewardsRatesChanged): void {
  let eternalFarming = EternalFarming.load(Bytes.fromUTF8(event.params.incentiveId.toHexString()));
  if (eternalFarming) {
    eternalFarming.rewardRate = event.params.rewardRate
    eternalFarming.bonusRewardRate = event.params.bonusRewardRate
    eternalFarming.save()
  }
}

export function handleRewardsAdded(event: RewardsAdded): void {
  let eternalFarming = EternalFarming.load(Bytes.fromUTF8(event.params.incentiveId.toHexString()));
  if (eternalFarming) {
    eternalFarming.reward = eternalFarming.reward.plus(event.params.rewardAmount)
    eternalFarming.bonusReward = eternalFarming.bonusReward.plus(event.params.bonusRewardAmount)
    eternalFarming.save()
  }
}

export function handleRewardDecreased(event: RewardAmountsDecreased): void {
  let eternalFarming = EternalFarming.load(Bytes.fromUTF8(event.params.incentiveId.toHexString()));
  if (eternalFarming) {
    eternalFarming.reward = eternalFarming.reward.minus(event.params.rewardAmount)
    eternalFarming.bonusReward = eternalFarming.bonusReward.minus(event.params.bonusRewardAmount)
    eternalFarming.save()
  }
}

export function handleCollect(event: RewardsCollected): void {

  let entity = Deposit.load(Bytes.fromUTF8(event.params.tokenId.toString()));

  if (entity) {
    let eternalFarmingID = entity.eternalFarming!.toHexString()
    let eternalFarming = EternalFarming.load(Bytes.fromUTF8(eternalFarmingID))

    if (eternalFarming) {
      eternalFarming.reward = eternalFarming.reward.minus(event.params.rewardAmount)
      eternalFarming.bonusReward = eternalFarming.bonusReward.minus(event.params.bonusRewardAmount)
      eternalFarming.save()


      let id = eternalFarming.rewardToken.toHexString() + entity.owner.toHexString()
      let rewardEntity = Reward.load(Bytes.fromUTF8(id))

      if (rewardEntity == null) {
        rewardEntity = new Reward(Bytes.fromUTF8(id))
        rewardEntity.amount = BigInt.fromString('0')
      }

      rewardEntity.owner = entity.owner
      rewardEntity.rewardAddress = eternalFarming.rewardToken
      rewardEntity.amount = rewardEntity.amount.plus(event.params.rewardAmount)
      rewardEntity.save();

      id = eternalFarming.bonusRewardToken.toHexString() + entity.owner.toHexString()
      rewardEntity = Reward.load(Bytes.fromUTF8(id))

      if (rewardEntity == null) {
        rewardEntity = new Reward(Bytes.fromUTF8(id))
        rewardEntity.amount = BigInt.fromString('0')
      }

      rewardEntity.owner = entity.owner
      rewardEntity.rewardAddress = eternalFarming.bonusRewardToken
      rewardEntity.amount = rewardEntity.amount.plus(event.params.bonusRewardAmount)
      rewardEntity.save();
    }
  }
}

