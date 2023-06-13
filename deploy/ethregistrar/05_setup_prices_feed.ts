import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { deployer, owner } = await getNamedAccounts()

  // const tellorFlexOracle = await ethers.getContract('TellorFlexOracle')

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  // const ExponentialPremiumPriceOracle = await ethers.getContractFactory(
  //   'ExponentialPremiumPriceOracle',
  //   deployer,
  // )
  // const priceFeeds = await ExponentialPremiumPriceOracle.deploy(
  //   tellorFlexOracle.address,
  //   // [0, 0, '17598934550989', '5358954845256', '158548959919'],
  //   [0, 0, 0, 0, 0],
  //   '100000000000000000000000000',
  //   21,
  // )
  // await priceFeeds.deployed()

  const controller = await ethers.getContract('ETHRegistrarController', owner)

  /**
   * TESTNET: 0xAe4da1a83c4B3B7EE58da02Dc013E92C568b8d03 (zero cost fee)
   * TESTNET: 0x25a5B7f9052A3312384bdEDB6678696EC18ECc4B (normal cost fee)
   */
  const tx = await controller.changePricesFeed(
    '0x25a5B7f9052A3312384bdEDB6678696EC18ECc4B',
  )
  console.log(`Updating new prices feed on (tx: ${tx.hash})...`)
  await tx.wait()
}

func.id = 'setup-prices-feed'
func.tags = ['SetupPricesFeed']
func.dependencies = ['ETHRegistrarController']

export default func
