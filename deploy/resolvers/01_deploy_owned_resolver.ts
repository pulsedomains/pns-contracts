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
  await deploy('OwnedResolver', deployArgs)
  return true
}

func.id = 'owned-resolver'
func.tags = ['OwnedResolver']
func.dependencies = []

export default func
