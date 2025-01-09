import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const deployArgs = {
    from: deployer,
    args: [],
    log: true,
  }
  await deploy('ExtendedDNSResolver', deployArgs)

  return true
}

func.id = 'extended-dns-resolver'
func.tags = ['ExtendedDNSResolver']
func.dependencies = []

export default func
