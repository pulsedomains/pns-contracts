import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  let fetchFlexAddress = ''
  // refer link: https://github.com/fetchoracle/telliot-core/blob/dev/src/telliot_core/data/contract_directory.json
  if (network.name === 'mainnet') {
    fetchFlexAddress = '' // TODO: fill FetchFlex address later
  } else {
    fetchFlexAddress = '0x20763435F23a727CD8748CE5d80a0b9F9c886110'
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
