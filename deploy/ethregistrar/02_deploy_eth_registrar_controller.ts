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
  const priceOracle = await ethers.getContract(
    'ExponentialPremiumPriceOracle',
    owner,
  )
  const reverseRegistrar = await ethers.getContract('ReverseRegistrar', owner)
  const nameWrapper = await ethers.getContract('NameWrapper', owner)

  const deployArgs = {
    from: deployer,
    args: [
      registrar.address,
      priceOracle.address,
      60,
      86400,
      reverseRegistrar.address,
      nameWrapper.address,
      registry.address,
    ],
    log: true,
  }
  await deploy('PLSRegistrarController', deployArgs)

  const controller = await ethers.getContract('PLSRegistrarController')

  if (owner !== deployer) {
    const tx = await controller.transferOwnership(owner)
    console.log(
      `Transferring ownership of PLSRegistrarController to ${owner} (tx: ${tx.hash})...`,
    )
    await tx.wait(2)
  }

  console.log(
    'WRAPPER OWNER',
    await nameWrapper.owner(),
    await nameWrapper.signer.getAddress(),
  )

  const tx1 = await nameWrapper.setController(controller.address, true)
  console.log(
    `Adding PLSRegistrarController as a controller of NameWrapper (tx: ${tx1.hash})...`,
  )
  await tx1.wait(2)

  const tx2 = await reverseRegistrar.setController(controller.address, true)
  console.log(
    `Adding PLSRegistrarController as a controller of ReverseRegistrar (tx: ${tx2.hash})...`,
  )
  await tx2.wait(2)

  return true
}

func.id = 'eth-registrar'
func.tags = ['PLSRegistrarController']
func.dependencies = [
  'PNSRegistry',
  'BaseRegistrarImplementation',
  'ExponentialPremiumPriceOracle',
  'ReverseRegistrar',
  'NameWrapper',
  'OwnedResolver',
]

export default func
