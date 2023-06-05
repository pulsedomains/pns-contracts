import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { deployer, owner } = await getNamedAccounts()

  const fetchFlexOracle = await ethers.getContract('FetchFlexOracle')

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  const ExponentialPremiumPriceOracle = await ethers.getContractFactory(
    'ExponentialPremiumPriceOracle',
    deployer,
  )
  const priceFeeds = await ExponentialPremiumPriceOracle.deploy(
    fetchFlexOracle.address,
    [0, 0, '17598934550989', '5358954845256', '158548959919'],
    // [0, 0, 0, 0, 0],
    '100000000000000000000000000',
    21,
  )
  await priceFeeds.deployed()

  const controller = await ethers.getContract('ETHRegistrarController', owner)

  /**
   * TESTNET: 0x611AAa46Da3C6733329a87d1823900758B2f1aEC (zero cost fee)
   * TESTNET: 0x34669C73E2Bd939ed0d5746d887f18Cca96C7951 (normal cost fee)
   */
  const tx = await controller.changePricesFeed(priceFeeds.address)
  console.log(`Updating new prices feed on (tx: ${tx.hash})...`)
  await tx.wait()
}

func.id = 'finalize-prices-feed'
func.tags = ['FinalizePricesFeed']
func.dependencies = ['ETHRegistrarController']

export default func
