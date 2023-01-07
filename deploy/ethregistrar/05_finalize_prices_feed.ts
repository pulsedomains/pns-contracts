import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, network } = hre
  const { deployer, owner } = await getNamedAccounts()

  let oracleAddr;
  if (network.name !== 'mainnet') {
    const dummyOracle = await ethers.getContract('DummyOracle')
    oracleAddr = dummyOracle.address
  } else {
    oracleAddr = ''
  }

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  const ExponentialPremiumPriceOracle = await ethers.getContractFactory('ExponentialPremiumPriceOracle', deployer)
  const priceFeeds = await ExponentialPremiumPriceOracle.deploy(
    oracleAddr,
    [0, 0, '17598934550989', '5358954845256', '158548959919'],
    // [0, 0, 0, 0, 0],
    '100000000000000000000000000',
    21
  )
  await priceFeeds.deployed()

  const controller = await ethers.getContract('ETHRegistrarController', owner)

  /**
   * TESTNET: 0x8Ccc6f889891750DcE083d970D2b58F455c5f7b7 (zero cost fee)
   * TESTNET: 0xefb2798Fd6eD515331F2d9B687F31d2420247e30 (normal cost fee)
   */
  const tx = await controller.changePricesFeed(priceFeeds.address)
  console.log(`Updating new prices feed on (tx: ${tx.hash})...`)
  await tx.wait()
}

func.id = 'finalize-prices-feed'
func.tags = ['FinalizePricesFeed']
func.dependencies = ['ETHRegistrarController']

export default func
