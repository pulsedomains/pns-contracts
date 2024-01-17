import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  let fetchFlexAddress = ''
  if (network.name === 'mainnet') {
    fetchFlexAddress = '0x6f390b99201bb43A05757019efe9C99651e04584'
  } else {
    fetchFlexAddress = '0x252eC80dEa7F3eD0CC57e0f1112d6f56Ae9523fb'
  }

  await deploy('FetchFlexOracle', {
    from: deployer,
    args: [fetchFlexAddress],
    log: true,
  })

  const fetchFlexOracle = await ethers.getContract('FetchFlexOracle')

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  await deploy('ExponentialPremiumPriceOracle', {
    from: deployer,
    args: [
      fetchFlexOracle.address,
      [0, 0, '17598934550989', '5358954845256', '158548959919'],
      '100000000000000000000000000',
      21,
    ],
    log: true,
  })

  return true
}

func.id = 'price-oracle'
func.tags = ['ExponentialPremiumPriceOracle']
func.dependencies = []

export default func
