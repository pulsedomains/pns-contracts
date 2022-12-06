import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  if (network.name === 'mainnet') {
    return true
  }

  await deploy('DummyOracle', {
    from: deployer,
    args: ['160000000000'],
    log: true,
  })

  const dummyOracle = await ethers.getContract('DummyOracle')

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  await deploy('ExponentialPremiumPriceOracle', {
    from: deployer,
    args: [
      dummyOracle.address,
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
