import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  let tellorFlexAddress = ''
  // refer link: https://github.com/telliot-io/telliot-core/blob/dev/src/telliot_core/data/contract_directory.json
  if (network.name === 'mainnet') {
    tellorFlexAddress = '0xD9157453E2668B2fc45b7A803D3FEF3642430cC0'
  } else {
    tellorFlexAddress = '0xD9157453E2668B2fc45b7A803D3FEF3642430cC0'
  }

  await deploy('TellorFlexOracle', {
    from: deployer,
    args: [tellorFlexAddress],
    log: true,
  })

  const tellorFlexOracle = await ethers.getContract('TellorFlexOracle')

  /**
   * 3 characters: $555/year
   * 4 characters: $169/year
   * 5+ characters: $5/year
   */
  await deploy('ExponentialPremiumPriceOracle', {
    from: deployer,
    args: [
      tellorFlexOracle.address,
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
