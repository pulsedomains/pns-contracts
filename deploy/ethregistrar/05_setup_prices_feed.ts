import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts } = hre
  const { deployer, owner } = await getNamedAccounts()

  // const fetchFlexOracle = await ethers.getContract('FetchFlexOracle')

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
  //   fetchFlexOracle.address,
  //   // [0, 0, '17598934550989', '5358954845256', '158548959919'],
  //   [0, 0, 158548959919, 158548959919, 158548959919],
  //   '100000000000000000000000000',
  //   21,
  // )
  // await priceFeeds.deployed()
  // console.log('New price feed address', priceFeeds.address)

  const controller = await ethers.getContract('PLSRegistrarController', owner)

  /**
   * TESTNET: 0x50C624fDf3E1B95D25F239B4c5DFE52fe2D4A950 (zero cost fee)
   * TESTNET: 0x3C91683AeBD680ea71A967e44391f22EdF8b2C0e (normal cost fee)
   */
  /**
   * MAINNET: 0x3be3E88814fF6e6BF98A6Af058a723e71Ec91D24 (zero cost fee) $0 for all
   * MAINNET: 0x3E3Bc047AeAa3FaFeAE96B2588A447e1FA70C818 (normal cost fee) $555/$169/$$5
   * MAINNET: 0x16Cba421390c883F201fF7EfFB1b540B4ca821f0 (super high fee) $5550/$555/$555
   * MAINNET: 0x198c6ec7F611B7799481f7a93787b32178e836b6 (super low fee) $5 for all
   */
  const tx = await controller.changePricesFeed(
    // priceFeeds.address,
    '0x16Cba421390c883F201fF7EfFB1b540B4ca821f0',
  )
  console.log(`Updating new prices feed on (tx: ${tx.hash})...`)
  await tx.wait()
}

func.id = 'setup-prices-feed'
func.tags = ['SetupPricesFeed']
func.dependencies = ['PLSRegistrarController']

export default func
