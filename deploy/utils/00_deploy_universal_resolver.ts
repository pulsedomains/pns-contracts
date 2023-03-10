import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry')
  const batchGatewayURLs = JSON.parse(process.env.BATCH_GATEWAY_URLS || '[]')

  // TODO: owner will update gateway urls later
  // if (batchGatewayURLs.length === 0) {
  //   throw new Error('UniversalResolver: No batch gateway URLs provided')
  // }

  await deploy('UniversalResolver', {
    from: deployer,
    args: [registry.address, batchGatewayURLs],
    log: true,
  })

  return true
}

func.id = 'universal-resolver'
func.tags = ['UniversalResolver']
func.dependencies = ['ENSRegistry']

export default func
