/* eslint-disable prefer-const */
import { ONE_BD, ZERO_BD, ZERO_BI } from './constants'
import { Bundle, Pool, Token } from './../types/schema'
import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { exponentToBigDecimal, safeDiv } from '../utils/index'

const WFUSE_ADDRESS = '0x0BE9e53fd7EDaC9F859882AfdDa116645287C629'
const VOLT_ADDRESS = '0x34Ef2Cc892a88415e9f02b91BfA9c91fC0bE6bD4'
const USDC_ADDRESS = '0x620fd5fa44be6af63715ef4e65ddfa0387ad13f5'

const BNB_V2_ADDRESS = '0x117c0419352ddb6fe575a67faa70315bdc4a93f3';
const DAI_V2_ADDRESS = '0x2502f488d481df4f5054330c71b95d93d41625c2';
const USDT_V2_ADDRESS = '0x68c9736781e9316ebf5c3d49fe0c1f45d2d104cd'
const USDC_V2_ADDRESS = '0x28C3d1cD466Ba22f6cae51b1a4692a831696391A';

const USDT_STARGATE_ADDRESS = '0x3695dd1d1d43b794c0b13eb8be8419eb3ac22bf7'
const USDC_STARGATE_ADDRESS  = '0xc6bc407706b7140ee8eef2f86f9504651b63e7f9'
const WETH_STARGATE_ADDRESS = '0x2f6f07cdcf3588944bf4c42ac74ff24bf56e7590'

const USDC_WFUSE_POOL = '0xe0724a2d7adefbf7cae5aee22f8f68bf86c82d3f'// USDC -> 0x620fd5fa44be6af63715ef4e65ddfa0387ad13f5

// token where amounts should contribute to tracked volume and liquidity
// usually tokens that many tokens are paired with s
export let WHITELIST_TOKENS: string[] = [
  WFUSE_ADDRESS.toLowerCase(),
  VOLT_ADDRESS.toLowerCase(),
  USDC_ADDRESS.toLowerCase(), 
  BNB_V2_ADDRESS.toLowerCase(),
  DAI_V2_ADDRESS.toLowerCase(),
  USDT_V2_ADDRESS.toLowerCase(),
  USDC_V2_ADDRESS.toLowerCase(),
  USDT_STARGATE_ADDRESS.toLowerCase(),
  USDC_STARGATE_ADDRESS.toLowerCase(),
  WETH_STARGATE_ADDRESS.toLowerCase()
]

let MINIMUM_Matic_LOCKED = BigDecimal.fromString('0')

let Q192 = Math.pow(2, 192)

let STABLE_COINS: string[] = [
  USDC_ADDRESS.toLowerCase(), 
  DAI_V2_ADDRESS.toLowerCase(),
  USDT_V2_ADDRESS.toLowerCase(),
  USDC_V2_ADDRESS.toLowerCase(),
  USDT_STARGATE_ADDRESS.toLowerCase(),
  USDC_STARGATE_ADDRESS.toLowerCase()
]



export function priceToTokenPrices(price: BigInt, token0: Token, token1: Token): BigDecimal[] {
  let num = price.times(price).toBigDecimal()
  let denom = BigDecimal.fromString(Q192.toString())
  let price1 = num
    .div(denom)
    .times(exponentToBigDecimal(token0.decimals))
    .div(exponentToBigDecimal(token1.decimals))

  let price0 = safeDiv(BigDecimal.fromString('1'), price1)
  return [price0, price1]
}

export function getEthPriceInUSD(): BigDecimal {
  let usdcPool = Pool.load(USDC_WFUSE_POOL) // dai is token0
  if (usdcPool !== null) {
    return usdcPool.token1Price
  } else {
    return ZERO_BD
  }
} 


/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived Matic (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token): BigDecimal {
  if (token.id == WFUSE_ADDRESS) {
    return ONE_BD
  }
  let whiteList = token.whitelistPools
  // for now just take USD from pool with greatest TVL
  // need to update this to actually detect best rate based on liquidity distribution
  let largestLiquidityMatic = ZERO_BD
  let priceSoFar = ZERO_BD
  let bundle = Bundle.load('1')

  // hardcoded fix for incorrect rates
  // if whitelist includes token - get the safe price
  if (STABLE_COINS.includes(token.id)) {
    priceSoFar = safeDiv(ONE_BD, bundle!.maticPriceUSD)
  } else {
  for (let i = 0; i < whiteList.length; ++i) {
    let poolAddress = whiteList[i]
    let pool = Pool.load(poolAddress)!
    if (pool.liquidity.gt(ZERO_BI)) {

      if (pool.token0 == token.id) {
        // whitelist token is token1
        let token1 = Token.load(pool.token1)!
        // get the derived Matic in pool
        let maticLocked = pool.totalValueLockedToken1.times(token1.derivedMatic)
        if (maticLocked.gt(largestLiquidityMatic) && maticLocked.gt(MINIMUM_Matic_LOCKED)) {
          largestLiquidityMatic = maticLocked
          // token1 per our token * Eth per token1
          priceSoFar = pool.token1Price.times(token1.derivedMatic as BigDecimal)
        }
      }
      if (pool.token1 == token.id) {
        let token0 = Token.load(pool.token0)!
        // get the derived Matic in pool
        let maticLocked = pool.totalValueLockedToken0.times(token0.derivedMatic)
        if (maticLocked.gt(largestLiquidityMatic) && maticLocked.gt(MINIMUM_Matic_LOCKED)) {
          largestLiquidityMatic = maticLocked
          // token0 per our token * Matic per token0
          priceSoFar = pool.token0Price.times(token0.derivedMatic as BigDecimal)
        }
      }
    }
  }
}
  return priceSoFar // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedAmountUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load('1')!
  let price0USD = token0.derivedMatic.times(bundle.maticPriceUSD)
  let price1USD = token1.derivedMatic.times(bundle.maticPriceUSD)

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(price0USD).plus(tokenAmount1.times(price1USD))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(price0USD).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount1.times(price1USD).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked amount is 0
  return ZERO_BD
}
