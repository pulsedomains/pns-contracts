import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  let oracleAddr
  if (network.name !== 'mainnet') {
    await deploy('DummyOracle', {
      from: deployer,
      args: ['16000000000'],
      log: true,
    })

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
  await deploy('ExponentialPremiumPriceOracle', {
    from: deployer,
    args: [
      oracleAddr,
      // [0, 0, 0, 0, 0], // TODO: use initial values
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
