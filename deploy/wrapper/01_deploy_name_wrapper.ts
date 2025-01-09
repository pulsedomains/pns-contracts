import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('PNSRegistry', owner)
  const registrar = await ethers.getContract(
    'BaseRegistrarImplementation',
    owner,
  )
  const metadata = await ethers.getContract('StaticMetadataService', owner)

  await deploy('NameWrapper', {
    from: deployer,
    args: [registry.address, registrar.address, metadata.address],
    log: true,
  })

  const nameWrapper = await ethers.getContract('NameWrapper')

  if (owner !== deployer) {
    const tx = await nameWrapper.transferOwnership(owner)
    console.log(
      `Transferring ownership of NameWrapper to ${owner} (tx: ${tx.hash})...`,
    )
    await tx.wait(2)
  }

  const tx2 = await registrar.addController(nameWrapper.address)
  console.log(
    `Adding NameWrapper as controller on registrar (tx: ${tx2.hash})...`,
  )
  await tx2.wait(2)

  return true
}

func.id = 'name-wrapper'
func.tags = ['NameWrapper']
func.dependencies = [
  'StaticMetadataService',
  'PNSRegistry',
  'ReverseRegistrar',
  'OwnedResolver',
]

export default func
